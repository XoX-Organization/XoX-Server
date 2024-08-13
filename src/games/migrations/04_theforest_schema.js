/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.createTable("game_theforest", (table) => {
        table.increments("id").primary()
        table.datetime("timestamp").defaultTo(knex.fn.now())

        table.string("uuid").notNullable().unique()
        table.string("name").notNullable()

        table.string("steam_app_beta_branch").nullable()
        table.string("steam_username").nullable()

        table.string("game_working_directory_path").notNullable()

        table.boolean("game_difficulty").nullable()
        table.boolean("game_vegan_mode").nullable()
        table.boolean("game_vegetarian_mode").nullable()
        table.boolean("game_reset_holes_mode").nullable()
        table.boolean("game_tree_regrow_mode").nullable()
        table.boolean("game_no_building_destruction").nullable()
        table.boolean("game_allow_enemies_creative").nullable()
        table.boolean("game_allow_cheats").nullable()
        table.boolean("game_realistic_player_damage").nullable()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
