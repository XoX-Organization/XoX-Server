#!/bin/bash
source "./start@~.sh"

cd "./Minecraft"
echo -e "Minecraft Server"

MINECRAFT_SERVER_SCRIPT=

findInstances

if ! printInstances;
then
    exit 1
fi

if ! chooseInstance;
then
    exit 1
fi

if ! loadInstance;
then
    exit 1
fi

NAME="Minecraft@$INSTANCE_NAME"

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

if ! updateJavaVersion;
then
    exit 1
fi

startScreenInstance "$NAME" "$MINECRAFT_SERVER_SCRIPT"

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
