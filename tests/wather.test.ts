import { setError } from '../src/utils';
import Router from 'koa-router';
import axios from 'axios';
import Weather from '../src/weather';

const routerGetMock = jest.fn();
jest.mock('koa-router', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: routerGetMock
    };
  });
});
jest.mock('../src/utils', () => {
  return {
    setError: jest.fn()
  };
});
jest.mock('axios');
describe('Weather tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('constructor', () => {
    it('constructs properly', () => {
      // @ts-ignore
      const installRoutesSpy = jest.spyOn(Weather.prototype, 'installRoutes');
      const weather = new Weather();
      expect(Router).toHaveBeenCalled();
      expect(installRoutesSpy).toHaveBeenCalled();
      expect(routerGetMock).toHaveBeenCalled;
    });
  });
  describe('fetchWeatherForCity tests', () => {
    let weather;
    let ctx;
    beforeEach(() => {
      weather = new Weather();
      ctx = { params: { city: 'Sofia' } };
    });
    it('gets correct info', async () => {
      // @ts-ignore
      axios.get.mockResolvedValue({ data: { coord: { lat: 123, lon: 123 } } });
      await weather.fetchWeatherForCity(ctx);
      expect(ctx).toStrictEqual({
        params: { city: 'Sofia' },
        body: { coord: { lat: 123, lon: 123 } }
      });
    });
    it('sets an error when it throws', async () => {
      // @ts-ignore
      axios.get.mockImplementationOnce(() => Promise.reject(new Error('something')));
      await weather.fetchWeatherForCity(ctx);
      expect(setError).toHaveBeenCalledWith(ctx, 400, 'error when retrieving data for Sofia', 'something');
    });
  });
});

