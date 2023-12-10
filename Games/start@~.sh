#!/bin/bash
# Template for starting a game instance

INSTANCE_NAME=
INSTANCE_FILE_PREFIX="instance@"

APP_ID=
APP_BETA_BRANCH="none"

APP_UPDATE_MAX_ATTEMPTS=5
APP_UPDATE_RETRY_DELAY=5
APP_PLATFORM="linux"

STEAM_PATH="$HOME/.steam/"
STEAM_USERNAME=

JAVA_VERSION=

# Private variables
INSTANCES=()
SELECTED_INSTANCE=

COLOR_A="\e[48;5;250m\e[38;5;235m"
COLOR_B="\e[48;5;235m\e[38;5;252m"
COLOR_RESET="\e[0m"

printHeader() {
    echo -e "\n"
    printf '%.0s=' {1..50}
    echo -e "\n$COLOR_A $1 $COLOR_RESET"
    printf '%.0s=' {1..50}
    echo -e "\n"
}

setWorkingDirectory() {
    printHeader "Setting working directory"

    if [ ! -d "$1" ];
    then
        echo -e "\nDirectory \"$1\" does not exist."
        return 1
    fi

    cd "$1"
    echo -e "\nWorking directory set to \"$1\"."
}

findInstances() {
    # Loop through each folder in current working directory and add them into the array
    while IFS= read -r -d $'\0' file;
    do
        INSTANCES+=("$file")
    done < <(find . -type f -name "$INSTANCE_FILE_PREFIX*" -print0)
}

printInstances() {
    printHeader "Instances available"

    if [ ${#INSTANCES[@]} -eq 0 ];
    then
        echo -e "No instances found."
        return 1
    fi

    # Print them out
    for i in "${!INSTANCES[@]}";
    do
        if ((i % 2 == 0));
        then
            echo -e -n "$COLOR_A"
        else
            echo -e -n "$COLOR_B"
        fi

        NAME=$(cat "${INSTANCES[i]}" | grep -E "^INSTANCE_NAME=" | cut -d "=" -f 2- | tr -d '"')
        echo -e " $((i + 1)).    ${NAME}    -> ${INSTANCES[i]##*/} $COLOR_RESET"
    done
}

chooseInstance() {
    read -p $'\nChoose Instance: ' -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[0-9]+$ || $REPLY -lt 1 || $REPLY -gt ${#INSTANCES[@]} ]];
    then
        echo -e "\nInvalid input. Please enter a valid number."
        return 1
    fi

    SELECTED_INSTANCE="${INSTANCES[REPLY - 1]}"
}

loadInstance() {
    printHeader "Loading variables from ${SELECTED_INSTANCE##*/}"

    if [ -z "$SELECTED_INSTANCE" ];
    then
        echo -e "\nNo instance selected."
        return 1
    fi

    source "$SELECTED_INSTANCE"
    cat "$SELECTED_INSTANCE" | grep -v "^#" | grep -E "="
}

updateApp() {
    printHeader "Updating App $APP_ID"
    attempt=0

    while ((attempt < APP_UPDATE_MAX_ATTEMPTS));
    do
        if /usr/games/steamcmd \
            +@sSteamCmdForcePlatformType "$APP_PLATFORM" \
            +login "$STEAM_USERNAME" \
            +app_update "$APP_ID" \
            -beta "$APP_BETA_BRANCH" \
            validate \
            +quit;
        then
            echo -e "\nUpdate successful."
            break
        else
            if ((attempt + 1 >= APP_UPDATE_MAX_ATTEMPTS));
            then
                echo -e "\nUpdate failed after $APP_UPDATE_MAX_ATTEMPTS attempts."
                return 1
            fi

            echo -e "\nUpdate failed. Retrying in $APP_UPDATE_RETRY_DELAY seconds.\n"
            sleep "$APP_UPDATE_RETRY_DELAY"
            ((attempt++))
        fi
    done
}

updateJavaVersion() {
    printHeader "Setting Java Version"

    JAVA_PATH=$(update-alternatives --list java | grep "$JAVA_VERSION")
    echo -e "$JAVA_VERSION -> \"$JAVA_PATH\""

    if [ -z "$JAVA_PATH" ];
    then
        echo -e "Java Version $JAVA_VERSION is not installed."
        return 1
    fi

    sudo update-alternatives --set java "$JAVA_PATH"
}

installPackages() {
    printHeader "Installing $@"
    sudo apt update && sudo apt install -y "$@"
}

checkScreenInstanceExists() {
    SCREEN_NAME="$1"

    if screen -ls | grep -q "$SCREEN_NAME";
    then
        echo -e "\n\n$SCREEN_NAME already exists."
        return 0
    fi

    return 1
}

startScreenInstance() {
    printHeader "Starting Instance $INSTANCE_NAME"
    SCREEN_NAME="$1"
    shift
    COMMAND="$(trim "$@")"

    echo -e "\n\nCommand Arguments:"
    echo -e "$COMMAND"

    echo -e "\n\nTips:"
    echo -e "To $COLOR_A view $COLOR_RESET the instances,         $COLOR_A screen -ls $COLOR_RESET"
    echo -e "To $COLOR_A attach $COLOR_RESET to the instance,     $COLOR_A screen -r $SCREEN_NAME $COLOR_RESET"
    echo -e "To $COLOR_A detach $COLOR_RESET from the instance,   $COLOR_A press Ctrl+A then Ctrl+D. $COLOR_RESET"

    screen -dm -S "$SCREEN_NAME" \
        bash -c "
        $COMMAND;
        echo -e '\n\nScreen session has been closed. Press Enter to exit.';
        read -p '';
        exit 0"

    echo -e "\n\nInstance has been started in the background."
}

trim() {
    echo "$1" | sed 's/^ *//;s/ *$//'
}

symlink() {
    if [ -L "$2" ];
    then
        rm "$2"
    fi

    if [ -e "$2" ];
    then
        echo -e "\n$2 already exists."
        return 1
    fi

    ln -sf "$1" "$2"
    echo -e "\nSymlinked $1 to $2."
}
