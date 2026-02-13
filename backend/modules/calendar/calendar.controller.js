import { successResponse, errorResponse } from '../../helpers/response.js';
import * as calendarService from './calendar.service.js';

export const generateToken = async (req, res, next) => {
  try {
    const feedUrl = await calendarService.generateToken(req.user);
    return successResponse(res, 200, 'Calendar feed URL generated', { feedUrl });
  } catch (error) {
    next(error);
  }
};

export const revokeToken = async (req, res, next) => {
  try {
    await calendarService.revokeToken(req.user);
    return successResponse(res, 200, 'Calendar feed token revoked');
  } catch (error) {
    next(error);
  }
};

const EMPTY_ICS =
  'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AAcounting//Empty//EN\r\nEND:VCALENDAR';

const sendIcs = (res, ics) => {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
  res.setHeader('Cache-Control', 'no-cache, max-age=0');
  return res.send(ics);
};

export const getFeed = async (req, res, next) => {
  try {
    let token = req.params.token || '';
    if (token.endsWith('.ics')) {
      token = token.slice(0, -4);
    }
    if (!token) {
      return sendIcs(res, EMPTY_ICS);
    }
    const ics = await calendarService.getFeedIcs(token);
    if (!ics) {
      return sendIcs(res, EMPTY_ICS);
    }
    return sendIcs(res, ics);
  } catch (error) {
    return sendIcs(res, EMPTY_ICS);
  }
};
