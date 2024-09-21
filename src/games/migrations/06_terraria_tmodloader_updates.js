/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable("game_terraria", (table) => {
        table.integer("game_difficulty").nullable()
        table.string("game_password").nullable()
        table.boolean("game_secure").nullable()
        table.boolean("game_upnp").nullable()
        table.integer("game_npcstream").nullable()
        table.integer("game_priority").nullable()
    })

    await knex.schema.alterTable("game_tmodloader", (table) => {
        table.integer("game_difficulty").nullable()
        table.string("game_password").nullable()
        table.boolean("game_secure").nullable()
        table.boolean("game_upnp").nullable()
        table.integer("game_npcstream").nullable()
        table.integer("game_priority").nullable()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
