export const jwtConfig = {
  get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    }
    return secret;
  },
  expiresIn: process.env.JWT_EXPIRE || '7d',
};

export default jwtConfig;

