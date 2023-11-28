#!/bin/bash
source "./start@~.sh"
echo -e "Minecraft Server"

MINECRAFT_SERVER_SCRIPT=

acceptEula() {
    EULA_FILE="$(dirname "$MINECRAFT_SERVER_SCRIPT")/eula.txt"
    if [ ! -f "$EULA_FILE" ];
    then
        echo -e "#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA)." \
            "\n#$(date)" \
            "\n#Signed by: $0" \
            "\neula=true" > "$EULA_FILE"
    fi
}

if ! setWorkingDirectory "./Minecraft";
then
    exit 1
fi

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

# The Minecraft server needs to be run from the same directory as the server jar
cd "$(dirname "$MINECRAFT_SERVER_SCRIPT")"

if ! acceptEula;
then
    echo -e "\nFailed to accept EULA."
    exit 1
fi

startScreenInstance "$NAME" "./$(basename "$MINECRAFT_SERVER_SCRIPT")"

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
