#!/bin/bash
echo -e "This script is used to start a tModLoader instance with the specified configuration file."

INSTANCE_FILE_PREFIX="instance@"
INSTANCES=()

TML_UPDATE_MAX_ATTEMPTS=5
TML_UPDATE_RETRY_DELAY=5

TML_STEAMID=1281930
PLATFORM="linux"

printHeader() {
    echo -e "\n"
    printf '%.0s=' {1..50}
    echo -e "\n\e[47;30m $1 \e[0m"
    printf '%.0s=' {1..50}
    echo -e "\n"
}

updateTModLoader() {
    printHeader "Updating tModLoader"
    attempt=0

    while ((attempt < TML_UPDATE_MAX_ATTEMPTS));
    do
        if /usr/games/steamcmd \
            +@sSteamCmdForcePlatformType "$PLATFORM" \
            +login "$STEAM_USERNAME" \
            +app_update "$TML_STEAMID" \
            -beta "$TML_BETA_BRANCH" \
            validate \
            +quit;
        then
            echo -e "\nUpdate successful."
            break
        else
            if ((attempt + 1 >= TML_UPDATE_MAX_ATTEMPTS));
            then
                echo -e "\nUpdate failed after $TML_UPDATE_MAX_ATTEMPTS attempts. Exiting."
                exit 1
            fi

            echo -e "\nUpdate failed. Retrying in $TML_UPDATE_RETRY_DELAY seconds.\n"
            sleep "$TML_UPDATE_RETRY_DELAY"
            ((attempt++))
        fi
    done
}

loadInstances() {
    printHeader "Instances available"

    # Loop through each folder in current working directory and add them into the array
    while IFS= read -r -d $'\0' file;
    do
        INSTANCES+=("$file")
    done < <(find . -type f -name "$INSTANCE_FILE_PREFIX*" -print0)

    # Print them out
    for i in "${!INSTANCES[@]}";
    do
        if ((i % 2 == 0));
        then
            echo -e -n "\e[47;30m"
        else
            echo -e -n "\e[40;37m"
        fi

        NAME=$(cat "${INSTANCES[i]}" | grep -E "^INSTANCE_NAME=" | cut -d "=" -f 2- | tr -d '"')
        echo -e " $((i + 1)).    ${INSTANCES[i]##*/} (${NAME}) \e[0m"
    done
}


### Start of script

loadInstances

# Choose instance
echo
read -p "Choose Instance: " choice

if [[ ! $choice =~ ^[0-9]+$ || $choice -lt 1 || $choice -gt ${#INSTANCES[@]} ]];
then
    echo -e "\nInvalid input. Please enter a valid number."
    exit 1
fi

# Load variables
selected="${INSTANCES[choice - 1]}"

printHeader "Loading variables from ${selected##*/}"
source "$selected"
cat "$selected" | grep -E "="

# Check if instance is already running
SCREEN_NAME="TML@$INSTANCE_NAME"
if screen -ls | grep -q "$SCREEN_NAME";
then
    echo -e "\n\n$SCREEN_NAME already exists. Either attach to the instance or stop it."
    exit 1
fi

# Update tModLoader
if [[ "$*" == *-noupdate* ]];
then
    echo -e "\nSkipping tModLoader update."
else
    updateTModLoader
fi

# Copy "enabled.json" to "enabled.json.constant" to prevent tModLoader from updating it
if [ ! -e "$TML_SAVE_DIR/Mods/enabled.json.constant" ];
then
    cp "$TML_SAVE_DIR/Mods/enabled.json" "$TML_SAVE_DIR/Mods/enabled.json.constant"
fi
rm "$TML_SAVE_DIR/Mods/enabled.json"
cp "$TML_SAVE_DIR/Mods/enabled.json.constant" "$TML_SAVE_DIR/Mods/enabled.json" > /dev/null 2>&1

# Start the instance
printHeader "Starting $INSTANCE_NAME"

echo -e "Tips:"
echo -e "To \e[47;30m view \e[0m the instances,         \e[47;30m screen -ls \e[0m"
echo -e "To \e[47;30m attach \e[0m to the instance,     \e[47;30m screen -r $SCREEN_NAME \e[0m"
echo -e "To \e[47;30m detach \e[0m from the instance,   \e[47;30m press Ctrl+A then Ctrl+D. \e[0m"

screen -dm -S "$SCREEN_NAME" \
    "${TML_SOURCE_DIR}/start-tModLoaderServer.sh" \
    -nosteam \
    -config "$CONFIG_PATH" \
    -tmlsavedirectory "$TML_SAVE_DIR" \
    -steamworkshopfolder none

echo -e "\n\nInstance has been started in the background."

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'

screen -r "$SCREEN_NAME"

exit 0
