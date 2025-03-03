import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import reportRoutes from './routes/report-routes';
import mapRoutes from './routes/map-routes';
import apiRoutes from './routes/api-routes';
import statisticsRoutes from './routes/statistics-routes';
import { getInstance } from './repository/SqlLiteDatabase';

const app = express();
const port = process.env.PORT || 7272;
const isDevelopmentEnv = process.env.NODE_ENV === 'dev';
const cacheKey = process.env.CACHE_KEY || `${Math.random()}`.replace('.', '');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  // eslint-disable-next-line prefer-destructuring
  res.locals.activePage = req.path.split('/')[1];
  res.locals.cacheKey = cacheKey;
  next();
});

app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'views', 'errors')
]);

app.use('/', reportRoutes);
app.use('/kart', mapRoutes);
app.use('/api', apiRoutes);
app.use('/statistikk', statisticsRoutes);

app.use(
  '/static',
  express.static('static', {
    ...(!isDevelopmentEnv && {
      setHeaders(res) {
        res.set(
          'Cache-Control',
          'max-age=86400, no-cache="Set-Cookie", public'
        );
      }
    })
  })
);

// Fallback error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).render('pages/500');
    next();
  }
);

// Handling 404
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(404).render('pages/404');
    next();
  }
);

async function initializeDatabase() {
  const db = getInstance('covid_db');
  const numberOfTables = (await db.listTables()).length;
  if (numberOfTables === 0) {
    await db.applyMigrationScripts(
      path.join(__dirname, 'migrations', 'schema')
    );
    console.info('Database was clean, applying migration scripts');
  } else {
    console.info('Migration scripts already applied, skipping');
  }
}

initializeDatabase().then(() => {
  app.listen(port);
  console.log(`API up and running on port ${port}`);
});
