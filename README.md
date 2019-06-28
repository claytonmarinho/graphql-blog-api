## Graphql-blog-api

Repository with the final files of the course https://ude.my/UC-DOULILDE

## Development

### First run

- Rename `./scr/config/config.example.json` to `./scr/config/config.json` and set the Mysql settings.
- npm i

### Start

- npm run mysql (case you want to use a mysql container - need to install docker-compose)
- npm run gulp
- npm run dev

### Test

Must create the db name on ./scr/config/config.json (testing enviroment). Default is `graphql-blog-api-test`.

- npm run test

### Coverage

- npm run coverage
