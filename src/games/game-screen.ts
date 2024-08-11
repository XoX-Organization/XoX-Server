import { select, Separator } from "@inquirer/prompts"
import { PersistedObject, PersistedSchema, Persistence } from "."
import Screen from "../common/screen"

abstract class GameScreen<
    T extends PersistedSchema,
    U extends PersistedObject<T>,
> implements Screen
{
    protected abstract persistence: Persistence<T, U>

    protected abstract updateMetadata: (
        metadata: Omit<T, "id" | "timestamp">,
    ) => Promise<Omit<T, "id" | "timestamp">>

    protected abstract createScreen: () => Promise<void>

    protected updateScreen = async (instances: U[]) => {
        const selectInstance = await select({
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
        if (selectInstance == null) {
            return
        }
        const updatedMetadata = await this.updateMetadata(selectInstance)
        await this.persistence.updateInstance(
            selectInstance.uuid,
            updatedMetadata,
        )
    }

    protected deleteScreen = async (instances: U[]) => {
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

    protected abstract hostScreen: (instance: U) => Promise<void>

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
                    await this.createScreen()
                    break
                case -2:
                    await this.updateScreen(availableInstances)
                    break
                case -3:
                    await this.deleteScreen(availableInstances)
                    break
                default:
                    await this.hostScreen(availableInstances[selectInstance])
                    break
            }
            continue
        }
    }
}

export default GameScreen
