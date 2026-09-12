import type { Response } from 'express';

export const responseRefreshToken = (
  response: Response,
  refreshToken: string,
) => {
  response.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth',
  });
};

export const removeRefreshToken = (response: Response) => {
  response.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
  });
};
