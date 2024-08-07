/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.createTable("game_tmodloader", (table) => {
        table.increments("id").primary()
        table.datetime("timestamp").defaultTo(knex.fn.now())

        table.string("uuid").notNullable().unique()
        table.string("name").notNullable()

        table.string("steam_app_beta_branch").nullable()
        table.string("steam_username").nullable()

        table.string("game_config_file_path").notNullable()
        table.string("game_save_folder_path").notNullable()
    })

    await knex.schema.createTable("game_minecraft_java", (table) => {
        table.increments("id").primary()
        table.datetime("timestamp").defaultTo(knex.fn.now())

        table.string("uuid").notNullable().unique()
        table.string("name").notNullable()

        table.string("game_working_directory_path").notNullable()
        table.string("game_version").notNullable()
        table.string("game_modloader_type").notNullable()
        table.string("game_modloader_version").notNullable()
        table.integer("game_max_ram").checkPositive().notNullable()
        table.integer("game_min_ram").checkPositive().notNullable()
        table.integer("game_java_version").checkPositive().notNullable()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
