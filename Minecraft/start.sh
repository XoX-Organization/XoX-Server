#!/bin/bash
echo -e "This script is used to start a Minecraft instance with the specified configuration file."

INSTANCE_FILE_PREFIX="instance@"
INSTANCES=()

printHeader() {
    echo -e "\n"
    printf '%.0s=' {1..50}
    echo -e "\n\e[47;30m $1 \e[0m"
    printf '%.0s=' {1..50}
    echo -e "\n"
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

setJavaVersion() {
    printHeader "Setting Java Version"

    # Check if Java Version is set
    if [ -z "$JAVA_VERSION" ];
    then
        echo -e "Java Version is not set. Exiting."
        return 1
    fi

    JAVA_PATH=$(update-alternatives --list java | grep "$JAVA_VERSION")
    sudo update-alternatives --set java "$JAVA_PATH"
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
SCREEN_NAME="Minecraft@$INSTANCE_NAME"
if screen -ls | grep -q "$SCREEN_NAME";
then
    echo -e "\n\n$SCREEN_NAME already exists. Either attach to the instance or stop it."
    exit 1
fi

# Set Java Version
if [[ "$*" == *-nojava* ]];
then
    echo -e "\nSkipping Java Version."
else
    setJavaVersion
fi

# Start the instance
printHeader "Starting $INSTANCE_NAME"

echo -e "Tips:"
echo -e "To \e[47;30m view \e[0m the instances,         \e[47;30m screen -ls \e[0m"
echo -e "To \e[47;30m attach \e[0m to the instance,     \e[47;30m screen -r $SCREEN_NAME \e[0m"
echo -e "To \e[47;30m detach \e[0m from the instance,   \e[47;30m press Ctrl+A then Ctrl+D. \e[0m"

screen -dm -S "$SCREEN_NAME" "$MINECRAFT_SERVER_SCRIPT"

echo -e "\n\nInstance has been started in the background."

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'

screen -r "$SCREEN_NAME"

exit 0
