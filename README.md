#Weather-app backend
Built with Koa and TypeScript, offers JWT secured authorization, user management, and retrieves the weather information from Openweathermap for a queried city
## Using the app

`npm start`<br/>
This command will trigger a TypeScript build and serve the resulting JavaScript files.<br/>
It does so on [http://localhost:4000](http://localhost:4000)

`npm test`<br/>
This will execute the Jest tests suite. You have various other scripts enabling you to watch for changes and autotest<br/>

`npm run build`<br/>
Builds the app, with the result going in the dist/ folder 
 
```
npm run dev
npm run start-dev
```
To start developing, you need to run both commands at the same time. The first will start a TypeScript dev server that automatically compiles all source files to JavaScript, while the later will start a nodemon process to serve the compiled files.<br/>

`npm run lint`<br/>
Runs eslint to check for linting errors.

<br/>All other scripts you can find in `package.json`
##Next steps
* Database to hold users' information, instead of a static file 
* Proper environment variables for various keys and OWM API configuration
* Swagger API description
