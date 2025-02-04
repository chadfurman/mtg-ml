const {chain}  = require('stream-chain');

const {parser} = require('stream-json');
const {ignore} = require('stream-json/filters/Ignore');
const {streamArray} = require('stream-json/streamers/StreamArray');

const fs   = require('fs');

const streamToPromise = require('stream-to-promise');

const logger = require('../utils/logger');

exports.seed = async function(knex) {
  let counter = 0;
  let inserted = 0;
  let failed = 0;

  // Deletes ALL existing entries
  await knex.raw('TRUNCATE TABLE ?? RESTART IDENTITY CASCADE', 'cards');

  const pipeline = chain([
    fs.createReadStream('/opt/data/scryfall-all-cards.json'),
    parser(),
    streamArray(),
    // extract the card
    ({ value }) => {
      // return an object matching the schema for the database insert
      return {
        name: value.name,
        oracle_id: value.oracle_id,
        lang: value.lang,
        released_at: value.released_at,
        mana_cost: value.mana_cost,
        cmc: value.cmc,
        type_line: value.type_line,
        oracle_text: value.oracle_text,
        reserved: value.reserved,
        set: value.set,
        set_name: value.set_name,
        set_type: value.set_type,

        colors: JSON.stringify(value.colors),
        color_identity: JSON.stringify(value.color_identity),
        legalities: JSON.stringify(value.legalities),
        games: JSON.stringify(value.games),
        related_uris: JSON.stringify(value.related_uris)
      };
    },
    // insert the card to the database
    (card) => {
      ++counter;
      return knex('cards').insert(card).then(() => {
        ++inserted;
      }).catch((e) => {
        logger.error('error:', { e });
        ++failed;
      });
    }
  ]);

  pipeline.on('end', () => {
    console.info('info: Counts', { counter, inserted, failed })
  });

  return streamToPromise(pipeline)
};
