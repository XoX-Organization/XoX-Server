import { confirm, select, Separator } from "@inquirer/prompts"
import * as Core from "."
import { PersistedObject, PersistedSchema, Persistence } from "."
import Screen from "../common/screen"

abstract class GameScreen<
    T extends PersistedSchema,
    U extends PersistedObject<T>,
> implements Screen
{
    /**
     * The persistence object for the game
     */
    protected abstract persistence: Persistence<T, U>

    /**
     * The default schema for the metadata
     */
    protected abstract metadataDefaultSchema: Omit<
        T,
        "id" | "timestamp" | "uuid"
    >

    /**
     * The function to prompt the user for the metadata configuration
     */
    protected abstract promptMetadataConfiguration: (
        metadata: Omit<T, "id" | "timestamp" | "uuid">,
    ) => Promise<Omit<T, "id" | "timestamp" | "uuid">>

    /**
     * The function to prompt the user to create a new instance
     */
    protected promptCreateScreen = async () => {
        await this.persistence.createInstance(
            await this.promptMetadataConfiguration(this.metadataDefaultSchema),
        )
    }

    /**
     * The function to prompt the user to update an existing instance
     */
    protected promptUpdateScreen = async (instances: U[]) => {
        const selected = await select({
            message: "Which instance would you like to update",
            choices: [
                new Separator(),
                ...instances.map((instance) => ({
                    name: `(${instance.uuid}) ${instance.name}`,
                    value: instance.raw,
                })),
                new Separator(),
                {
                    name: "Cancel",
                    value: undefined,
                },
            ],
        })
        if (selected == null) {
            return
        }
        await this.persistence.updateInstance(
            selected.uuid,
            await this.promptMetadataConfiguration(selected),
        )
    }

    /**
     * The function to prompt the user to delete an existing instance
     */
    protected promptDeleteScreen = async (instances: U[]) => {
        const selectInstance = await select({
            message: "Which instance would you like to delete",
            choices: [
                new Separator(),
                ...instances.map((instance) => ({
                    name: `(${instance.uuid}) ${instance.name}`,
                    value: instance.raw,
                })),
                new Separator(),
                {
                    name: "Cancel",
                    value: undefined,
                },
            ],
        })
        if (selectInstance == null) {
            return
        }
        await this.persistence.deleteInstance(selectInstance.uuid)
    }

    /**
     * The function to perform the startup initialization for the game
     */
    protected abstract performStartupInitialization: (
        instance: U,
    ) => Promise<void>

    public show = async () => {
        while (true) {
            const availableInstances = await this.persistence.findAllInstances()
            const selectInstance = await select({
                loop: false,
                message:
                    availableInstances.length > 0
                        ? "Which instance would you like to play with"
                        : "No instance found, what would you like to do",
                choices: [
                    ...(availableInstances.length > 0
                        ? [
                              new Separator(),
                              ...availableInstances.map((instance, index) => ({
                                  name: `(${instance.uuid}) ${instance.name}`,
                                  value: index,
                              })),
                              new Separator(),
                          ]
                        : []),
                    {
                        name: "Create New Instance",
                        value: -1,
                    },
                    ...(availableInstances.length > 0
                        ? [
                              {
                                  name: "Update Existing Instance",
                                  value: -2,
                              },
                              {
                                  name: "Delete Instance",
                                  value: -3,
                              },
                          ]
                        : []),
                    {
                        name: "Cancel",
                        value: undefined,
                    },
                ],
            })
            if (selectInstance == null) {
                return
            }
            switch (selectInstance) {
                case -1:
                    await this.promptCreateScreen()
                    break
                case -2:
                    await this.promptUpdateScreen(availableInstances)
                    break
                case -3:
                    await this.promptDeleteScreen(availableInstances)
                    break
                default:
                    await this.performStartupInitialization(
                        availableInstances[selectInstance],
                    )
                    if (
                        await Core.existsScreen(
                            availableInstances[selectInstance],
                        )
                    ) {
                        const attachToScreen = await confirm({
                            message:
                                "Do you want to attach the screen to the terminal",
                            default: true,
                        })
                        if (attachToScreen) {
                            await Core.attachScreen(
                                availableInstances[selectInstance],
                            )
                        }
                    }
                    break
            }
            continue
        }
    }
}

export default GameScreen
