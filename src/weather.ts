import Router from 'koa-router';
import { Context } from 'koa';
import axios from 'axios';
import { setError } from './utils';

//pls don't abuse key
const OWM_API_KEY = process.env.OMW_API_KEY || '1991b65c2188e5cd2e73063499569612';

export default class Weather {
  private readonly OMW_CURR_WTHR_URL = 'https://api.openweathermap.org/data/2.5/weather?q=';
  private readonly OMW_ONECALL_API_URL = 'https://api.openweathermap.org/data/2.5/onecall';
  router: Router;

  constructor() {
    this.router = new Router();
    this.installRoutes();
  }

  private installRoutes(): void {
    this.router.get('/weather/:city', this.fetchWeatherForCity.bind(this));
  }

  private async fetchWeatherForCity(ctx: Context) {
    const city = String(ctx.params.city);
    try {
      let response = await axios.get(`${this.OMW_CURR_WTHR_URL}${city}&apikey=${OWM_API_KEY}&units=metric`);
      const { coord } = response.data;
      // eslint-disable-next-line max-len
      response = await axios.get(`${this.OMW_ONECALL_API_URL}?lat=${coord.lat}&lon=${coord.lon}&exclude=hourly,minutely&apikey=${OWM_API_KEY}&units=metric`);
      ctx.body = response.data;
    } catch (e) {
      setError(ctx, 400, `error when retrieving data for ${city}`, e.message);
    }
  }

}
