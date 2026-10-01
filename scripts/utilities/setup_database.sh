#!/bin/bash

set -e

function prompt_yes_no() {
    whiptail --yesno "$1" 10 60
    return $?
}

function select_database() {
    whiptail --title "Select Database" --menu "Choose a database:" 15 60 4 \
        "mysql" "MariaDB" \
        "sqlite" "SQLite (local files only)" 3>&1 1>&2 2>&3
}

function install_package_if_missing() {
    local pkg="$1"
    if ! dpkg -s "$pkg" &>/dev/null; then
        echo ">>> Installing $pkg..."
        sudo apt-get update && sudo apt-get install -y "$pkg"
    else
        echo ">>> $pkg is already installed"
    fi
}

function get_mariadb_users() {
    sudo mysql -N -e "SELECT User FROM mysql.user WHERE User NOT IN ('mysql.sys', 'root', 'debian-sys-maint');" 2>/dev/null
}

function prompt_user_selection() {
    local db="$1"
    local users=("newuser" "<New user>")
    if [[ "$db" == "mariadb" ]]; then
        while read -r user; do users+=("$user" "$user"); done < <(get_mariadb_users)
    elif [[ "$db" == "postgresql" ]]; then
        while read -r user; do users+=("$user" "$user"); done < <(get_postgres_users)
    fi
    whiptail --title "Select User" --menu "Choose or create a DB user:" 20 60 10 "${users[@]}" 3>&1 1>&2 2>&3
}


#### Main Flow ####
if prompt_yes_no "A new database integration feature is available. Would you like to use it?"; then
    db=$(select_database)

    case "$db" in
        mysql)
            install_package_if_missing mariadb-server
            sudo systemctl start mariadb

            while true; do
                user=$(prompt_user_selection "mariadb")
                if [[ "$user" == "newuser" ]]; then
                    user=$(whiptail --inputbox "Enter new username:" 10 50 "" 3>&1 1>&2 2>&3)
                    pass=$(whiptail --passwordbox "Enter password for new user:" 10 50 3>&1 1>&2 2>&3)
                    sudo mysql -e "CREATE USER '$user'@'localhost' IDENTIFIED BY '$pass';"
                    sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO '$user'@'localhost'; FLUSH PRIVILEGES;"
                    break
                else
                    pass=$(whiptail --passwordbox "Enter password for user $user:" 10 50 3>&1 1>&2 2>&3)
                    if mysql -u "$user" -p"$pass" -e "SELECT 1;" &>/dev/null; then
                        break
                    else
                        whiptail --msgbox "Login failed for user '$user'. Returning to user selection." 8 60
                    fi
                fi
            done
            ;;

        sqlite)
            install_package_if_missing sqlite3
            whiptail --msgbox "SQLite requires no setup. You can use .db files directly." 10 60
            user="sqlite_user"
            ;;
    esac

    whiptail --msgbox "Database setup complete using $db and user $user." 10 60
else
    echo "Feature skipped."
fi
