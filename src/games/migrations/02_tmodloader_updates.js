/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable("game_tmodloader", (table) => {
        table.dropColumn("game_config_file_path")
        table.renameColumn(
            "game_save_folder_path",
            "game_working_directory_path",
        )

        table.integer("game_autocreate").checkPositive().notNullable()
        table.string("game_seed").nullable()

        table.integer("game_port").checkPositive().notNullable()
        table.integer("game_maxplayers").checkPositive().notNullable()
        table.string("game_pass").nullable()
        table.string("game_motd").nullable()
        table.boolean("game_secure").notNullable()
        table.boolean("game_noupnp").notNullable()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {}
