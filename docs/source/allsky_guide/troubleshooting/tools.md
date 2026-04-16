This pages lists some tools and techniques to aid in troubleshooting Allsky. If you have any other tools, please submit a GitHub Discussion and let the Allsky developers know.

**allsky-config command**

The ```allsky-config``` command performs various actions. Some let you easily configure a feature (like the ability to share files between your Pi and a PC or Mac), while other actions let you view various types of information which is often used to troubleshoot.

The list of actions grows often so is not shown here but you can enter ```allsky-config --help``` to see the list.

!!! info  "Info"

    The Allsky developers may ask you to run ```allsky-config``` to provide additional information. In most cases you can simply copy and paste the command you are asked to run into a terminal window on the Pi.

```allsky-config``` can be used two different ways:

- **Menu-driven**
  
    In this mode you simply type ```allsky-config``` and are presented with a menu of actions you can perform. Use the up and down arrow keys to navigate the list and the left right arrow keys to go to the choices at the end of the list. After selecting an action, if additional information is needed you are prompted for it. The action you selected is then executed and its output displayed.
  
    You can then enter q to quit ```allsky-config``` or press return to be shown the menu of actions again.

    When viewing the menu, the name of the action that will be taken is listed at the end of every entry. That action name is used in the next mode of ```allsky-config``` - see below.

- **Action-specific**
    
    In this mode, you type ```allsky-config ACTION``` where "ACTION" is the name of an actions to execute, optionally followed by arguments.
    
    For example: ```allsky-config show_supported_cameras --zwo```.
    
    Most actions only output information but a few first prompt for something then perform the action.

To see what an action does and what, if any arguments it takes, enter ```allsky-config ACTION --help```, replacing "ACTION" with an action name shown in the command above.


**htop**

If your Pi seems very slow you can run the Linux ```htop``` command which displays the usage of all the CPUs and the amount of memory and swap in use, as well as the processes using the most CPU. The display is updated roughly every second.

You will probably first need to install htop by executing ```sudo apt install htop```.