/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.createTable("game_palworld", (table) => {
        table.increments("id").primary()
        table.datetime("timestamp").defaultTo(knex.fn.now())

        table.string("uuid").notNullable().unique()
        table.string("name").notNullable()

        table.string("steam_app_beta_branch").nullable()
        table.string("steam_username").nullable()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
