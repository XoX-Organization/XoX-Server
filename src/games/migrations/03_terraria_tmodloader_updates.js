/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable("game_terraria", (table) => {
        table.dropColumn("game_worldname")
        table.dropColumn("game_maxplayers")
        table.dropColumn("game_pass")
        table.dropColumn("game_secure")
        table.dropColumn("game_noupnp")
    })

    await knex.schema.alterTable("game_tmodloader", (table) => {
        table.dropColumn("game_worldname")
        table.dropColumn("game_maxplayers")
        table.dropColumn("game_pass")
        table.dropColumn("game_secure")
        table.dropColumn("game_noupnp")
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
