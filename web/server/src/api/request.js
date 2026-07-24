import axios from 'axios'

// No global timeout — synthesis + training can take a long time.
const instance = axios.create({ timeout: 0 })

instance.interceptors.response.use((response) => response.data)

export default instance
