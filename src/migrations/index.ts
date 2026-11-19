import * as migration_20261118_235659_init from './20261118_235659_init';

export const migrations = [
  {
    up: migration_20261118_235659_init.up,
    down: migration_20261118_235659_init.down,
    name: '20261118_235659_init'
  },
];
