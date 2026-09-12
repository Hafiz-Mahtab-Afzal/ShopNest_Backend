
import Redis from 'ioredis'


const redisconnect = new Redis(process.env.REDIS_URL as string)

redisconnect.on('connect', () => console.log(`redis connected with express`))
redisconnect.on('error', (err) => console.log(`redis connection failed ... ${err.message}`))

export default redisconnect