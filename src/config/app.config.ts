import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '5000', 10),
  name: process.env.APP_NAME || 'TownBolt',
  frontendUrl: process.env.FRONTEND_URL,
  mobileAppScheme: process.env.MOBILE_APP_SCHEME,
}));
