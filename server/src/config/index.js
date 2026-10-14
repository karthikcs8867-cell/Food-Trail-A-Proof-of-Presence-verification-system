import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'foodtrail_super_secure_jwt_secret_2026',
  jwtExpiresIn: '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || 'mock_google_client_id',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_google_secret',
  metaAppId: process.env.META_APP_ID || 'mock_meta_app_id',
  metaAppSecret: process.env.META_APP_SECRET || 'mock_meta_secret',
  defaultGeofenceRadiusMeters: 200, // 200 meters geofence radius
  uploadDir: path.resolve(__dirname, '../../uploads'),
  dataDir: path.resolve(__dirname, '../../data'),
};
