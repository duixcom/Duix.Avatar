# Windows Docker troubleshooting

This guide covers rapid customization failures on Windows with Docker Desktop, especially when TTS cannot reach FunASR.

Related issues: #11, #66, and #619.

## Recognize the failure chain

The following errors can be symptoms of the same underlying ASR connection problem:

- TTS returns 'NoneType' object has no attribute 'send'
- The client reports SQLite3 can only bind numbers, strings, bigints, buffers, and null
- The preprocess API returns code: -1
- Docker logs show Connection refused for the FunASR WebSocket
- The client appears to save a model even though training failed

The SQLite error is secondary. When training fails, the client receives an invalid voice ID (for example, false) and then attempts to bind it to SQLite. Check the TTS/ASR response first; do not delete the database as the first step.

## 1. Validate Compose before restarting

From the deploy directory:

~~~powershell
docker compose config --quiet
~~~

If this command reports a YAML scanner or mapping error, fix the YAML before running down or up. Use spaces consistently and keep list items indented below their parent key.

A valid network alias block for a service named heygem-asr is:

~~~yaml
services:
  heygem-asr:
    networks:
      ai_network:
        aliases:
          - funasr
          - duix-avatar-asr
~~~

The official Compose file uses the duix-avatar-asr service/container name. If a local Compose file renames that service to heygem-asr, the alias above preserves the hostname expected by the TTS image.

## 2. Recreate and wait for ASR

After the configuration validates:

~~~powershell
docker compose down --remove-orphans
docker compose up -d --force-recreate
docker compose ps
docker logs --tail 200 heygem-asr
~~~

Wait until the ASR log confirms that it is listening on port 10095, for example:

~~~text
asr model init finished. listen on port:10095
~~~

The container being marked Up does not always mean the ASR model is ready.

## 3. Verify the Docker network

Show the IP addresses and aliases:

~~~powershell
docker inspect heygem-tts --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} aliases={{json .Aliases}}{{end}}'
docker inspect heygem-asr --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} aliases={{json .Aliases}}{{end}}'
~~~

TTS and ASR must share at least one Docker network. The duix-avatar-asr alias must appear on the ASR container, not only on the TTS container.

Test DNS from inside TTS:

~~~powershell
docker exec heygem-tts /opt/conda/envs/python310/bin/python3 -c "import socket; print(socket.gethostbyname('duix-avatar-asr'))"
~~~

A DNS result alone is not sufficient. Test TCP:

~~~powershell
docker exec heygem-tts /opt/conda/envs/python310/bin/python3 -c "import socket; s=socket.create_connection(('duix-avatar-asr',10095),5); print('ASR TCP OK'); s.close()"
~~~

Then test the WebSocket used by TTS:

~~~powershell
docker exec heygem-tts /opt/conda/envs/python310/bin/python3 -c "from websocket import create_connection; ws=create_connection('ws://duix-avatar-asr:10095',timeout=10); print('ASR WS OK'); ws.close()"
~~~

If DNS resolves but TCP returns ConnectionRefusedError, ASR is not listening yet or the hostname resolves to the wrong container.

## 4. Verify the audio bind mount

Use the path configured by the active Compose file. For example:

~~~text
D:\duix_avatar_data\voice\data -> /code/data
~~~

Check the actual mount without relying on a PowerShell Go-template quoting expression:

~~~powershell
$info = docker inspect heygem-tts | ConvertFrom-Json
$info[0].Mounts | Select-Object Type,Source,Destination | Format-Table -AutoSize
~~~

Check the host file:

~~~powershell
Test-Path 'D:\duix_avatar_data\voice\data\example.wav'
~~~

Check the same file inside TTS:

~~~powershell
docker exec heygem-tts sh -c "ls -lh /code/data/origin_audio/example.wav"
~~~

The API value should be relative to the container data directory:

~~~json
{
  "format": "wav",
  "reference_audio": "origin_audio/example.wav",
  "lang": "zh"
}
~~~

Do not send the Windows host path as reference_audio.

## 5. Test the API before retrying the desktop client

~~~powershell
$body = @{
  format = 'wav'
  reference_audio = 'origin_audio/example.wav'
  lang = 'zh'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://127.0.0.1:18180/v1/preprocess_and_tran' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 300
~~~

Only retry model creation after this endpoint returns a successful code. If it returns code: -1, fix the server-side error first.

## Quick checklist

1. docker compose config --quiet succeeds.
2. All three containers are running.
3. ASR logs confirm port 10095.
4. TTS and ASR share a network.
5. The ASR container has the duix-avatar-asr alias when custom service names are used.
6. DNS, TCP, and WebSocket tests succeed from TTS.
7. The WAV exists on the host and inside /code/data/origin_audio.
8. /v1/preprocess_and_tran returns success before the desktop client is retried.

