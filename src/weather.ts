import Router from 'koa-router';
import { Context } from 'koa';
import axios from 'axios';
import { setError } from './utils';

//pls don't abuse key
const OWM_API_KEY = process.env.OMW_API_KEY || '1991b65c2188e5cd2e73063499569612';

/**
 * A class to retrieve the current weather information for a given city from OpenWeatherMap.org
 */
export default class Weather {
  private readonly OMW_CURR_WTHR_URL = 'https://api.openweathermap.org/data/2.5/weather';
  private readonly OMW_ONECALL_API_URL = 'https://api.openweathermap.org/data/3.0/onecall';
  router: Router;

  constructor() {
    this.router = new Router();
    this.installRoutes();
  }

  private installRoutes(): void {
    this.router.get('/weather/:city', this.fetchWeatherForCity.bind(this));
  }

  /**
   * Fetches the weather info for any city. It first queries the OWM "Current weather" API endpoint, because that's
   * the only thing that I sawa (on the free account tier) that gives you back latitude and longitute of the city.
   * It then uses this latitude and longitude information to query the "Onecall" API endpoint, which fetches all
   * required information.
   * @param ctx
   */
  private async fetchWeatherForCity(ctx: Context) {
    const city = String(ctx.params.city);
    try {
      let response = await axios.get(`${this.OMW_CURR_WTHR_URL}?q=${city}&appid=${OWM_API_KEY}&units=metric`);
      const { coord } = response.data;
      // eslint-disable-next-line max-len
      response = await axios.get(`${this.OMW_ONECALL_API_URL}?lat=${coord.lat}&lon=${coord.lon}&exclude=hourly,minutely&appid=${OWM_API_KEY}&units=metric`);
      ctx.body = response.data;
    } catch (e) {
      setError(ctx, 400, `error when retrieving data for ${city}`, e.message);
    }
  }

}
