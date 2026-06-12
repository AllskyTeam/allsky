import board
import time
import sys
from digitalio import DigitalInOut, Direction
from typing import Literal, Dict
from services.gpio import get_board_pin
from services.helpers import load_module_config

def motor_action(motor_type:Literal['a4988', 'byj'] = 'a4988', action:str='move', motor_direction: str = 'in', steps:int = 100, speed: Literal['slow', 'fast'] = 'slow' ) -> Dict|None:

    motor_config = load_module_config('focuser')

    motor_type = motor_config.get('type', 'a4988')
    
    if motor_type == 'a4988':

        direction_pin = motor_config.get('pins', {}).get('direction', 22)
        step_pin = motor_config.get('pins', {}).get('step', 23)
        enable_pin = motor_config.get('pins', {}).get('enable', 24)

        motor = A4988Nema(direction_pin, step_pin, enable_pin)
        step_delay = 0.0001 if speed == 'fast' else 0.001
        
    if motor_type == 'uln2003':
        #pins = [17, 27 , 5, 6]
        
        in1 = motor_config.get('pins', {}).get('in1', 17)
        in2 = motor_config.get('pins', {}).get('in2', 27)
        in3 = motor_config.get('pins', {}).get('in3', 5)
        in4 = motor_config.get('pins', {}).get('in4', 6)
        pins = [in1, in2 , in3, in4]
        
        motor = ULN2003Motor(pins)
        step_delay = 0.003 if speed == 'fast' else 0.009
        
    if action == 'enable':
        motor.enable_motor()

    if action == 'disable':
        motor.disable_motor()

    if action == 'stop':
        motor.stop()
        
    if action == 'move':
        direction = True if motor_direction == 'in' else False
        
        motor.motor_go(direction, 'full', steps, step_delay)
       
class StopMotorInterrupt(Exception):
    """ Stop the motor """
    pass

class A4988Nema(object):
    def __init__(self, direction_pin, step_pin, enable_pin, motor_type="A4988"):

        self.motor_type = motor_type
        self.direction_pin = direction_pin
        self.step_pin = step_pin
        self.enable_pin = enable_pin
        self.stop_motor = False
        
        self.DIR = DigitalInOut(get_board_pin(self.direction_pin))
        self.DIR.direction = Direction.OUTPUT     
        self.STEP = DigitalInOut(get_board_pin(self.step_pin))
        self.STEP.direction = Direction.OUTPUT        
        self.EN = DigitalInOut(get_board_pin(self.enable_pin))
        self.EN.direction = Direction.OUTPUT  
                
    def stop(self):
        self.stop_motor = True

    def enable_motor(self):
        self.EN.value = False

    def disable_motor(self):
        self.EN.value = True
 
 
    def degree_calc(self, steps, step_type):
        """ calculate and returns size of turn in degree
        , passed number of steps and steptype"""
        degree_value = {'full': 1.8,
                        'half': 0.9,
                        '1/4': .45,
                        '1/8': .225,
                        '1/16': 0.1125,
                        '1/32': 0.05625,
                        '1/64': 0.028125,
                        '1/128': 0.0140625}
        degree_value = (steps*degree_value[step_type])
        return degree_value
    
    def motor_go(self, clockwise=False, step_type="full", steps=200, step_delay=.001, verbose=False, init_delay=.05):

        self.stop_motor = False
        
        self.DIR.value = clockwise        

        try:
            time.sleep(init_delay)

            for i in range(steps):
                if self.stop_motor:
                    raise StopMotorInterrupt
                else:
                    self.STEP.value = True
                    time.sleep(step_delay)
                    self.STEP.value = False
                    time.sleep(step_delay)
                    if verbose:
                        print("Steps count {}".format(i+1), end="\r", flush=True)

        except KeyboardInterrupt:
            print("User Keyboard Interrupt : RpiMotorLib:")
        except StopMotorInterrupt:
            print("Stop Motor Interrupt : RpiMotorLib: ")
        except Exception as motor_error:
            print(sys.exc_info()[0])
            print(motor_error)
            print("RpiMotorLib  : Unexpected error:")
        else:
            # print report status
            if verbose:
                print("\nRpiMotorLib, Motor Run finished, Details:.\n")
                print("Motor type = {}".format(self.motor_type))
                print("Clockwise = {}".format(clockwise))
                print("Step Type = {}".format(step_type))
                print("Number of steps = {}".format(steps))
                print("Step Delay = {}".format(step_delay))
                print("Intial delay = {}".format(init_delay))
                print("Size of turn in degrees = {}".format(self.degree_calc(steps, step_type)))
        finally:
            # cleanup
            self.STEP.value = False
            self.STEP.value = False

class ULN2003Motor(object):

    def __init__(self, gpiopins, name="BYJMotorX", motor_type="28BYJ"):
        self.name = name
        self.motor_type = motor_type
        self.stop_motor = False
        self.gpiopins = gpiopins
        self.PINS = {}
        
        for pin_number in self.gpiopins:
            pin = DigitalInOut(get_board_pin(pin_number))   
            pin.direction = Direction.OUTPUT  
            self.PINS[pin_number] = pin
        
    def stop(self):
        """ Stop the motor """
        self.stop_motor = True

    def enable_motor(self):
        pass

    def disable_motor(self):
        pass
        
    def motor_go(self, direction, step_type="half", steps=200, step_delay=1, verbose=False):

        if steps < 0:
            print("Error BYJMotor 101: Step number must be greater than 0")
            quit()
                
    #    try:
        self.stop_motor = False
        # select step based on user input
        # Each step_sequence is a list containing GPIO pins that should be set to High
        if step_type == "half":  # half stepping.
            step_sequence = list(range(0, 8))
            step_sequence[0] = [self.gpiopins[0]]
            step_sequence[1] = [self.gpiopins[0], self.gpiopins[1]]
            step_sequence[2] = [self.gpiopins[1]]
            step_sequence[3] = [self.gpiopins[1], self.gpiopins[2]]
            step_sequence[4] = [self.gpiopins[2]]
            step_sequence[5] = [self.gpiopins[2], self.gpiopins[3]]
            step_sequence[6] = [self.gpiopins[3]]
            step_sequence[7] = [self.gpiopins[3], self.gpiopins[0]]
        elif step_type == "full":  # full stepping.
            step_sequence = list(range(0, 4))
            step_sequence[0] = [self.gpiopins[0], self.gpiopins[2]]
            step_sequence[1] = [self.gpiopins[1], self.gpiopins[2]]
            step_sequence[2] = [self.gpiopins[1], self.gpiopins[3]]
            step_sequence[3] = [self.gpiopins[0], self.gpiopins[3]]
        elif step_type == "wave":  # wave driving
            step_sequence = list(range(0, 4))
            step_sequence[0] = [self.gpiopins[0]]
            step_sequence[1] = [self.gpiopins[1]]
            step_sequence[2] = [self.gpiopins[2]]
            step_sequence[3] = [self.gpiopins[3]]
        else:
            print("Error: BYJMotor 102 : unknown step type : half, full or wave")
            print(step_type)
            quit()

        #  To run motor in reverse we flip the sequence order.
        if direction:
            step_sequence.reverse()

        def display_degree():
            """ display the degree value at end of run if verbose"""
            if self.motor_type == "28BYJ":
                degree = 1.422222
                print("Size of turn in degrees = {}".format(round(steps/degree, 2)))
            elif self.motor_type == "Nema":
                degree = 7.2
                print("Size of turn in degrees = {}".format(round(steps*degree, 2)))
            else:
                # Unknown Motor type
                print("Warning 201 : Unknown Motor Type : {}".format(self.motor_type))
                print("Size of turn in degrees = N/A")

        def print_status(enabled_pins):
            """   Print status of pins."""
            if verbose:
                print("Next Step: Step sequence remaining : {} ".format(steps_remaining))
                for pin_print in self.gpiopins:
                    if pin_print in enabled_pins:
                        print("GPIO pin on {}".format(pin_print))
                    else:
                        print("GPIO pin off {}".format(pin_print))

        # Iterate through the pins turning them on and off.
        steps_remaining = steps
        while steps_remaining > 0:
            for pin_list in step_sequence:
                print(step_sequence)
                for pin in self.gpiopins:
                    if self.stop_motor:
                        raise StopMotorInterrupt
                    else:
                        if pin in pin_list:
                            self.PINS[pin].value = True
                        else:
                            self.PINS[pin].value = False
                print_status(pin_list)
                time.sleep(step_delay)
            steps_remaining -= 1
        for pin in self.PINS:
            self.PINS[pin].value= False
                
  #      except KeyboardInterrupt:
  #          print("User Keyboard Interrupt : RpiMotorLib: ")
  #      except StopMotorInterrupt:
  #          print("Stop Motor Interrupt : RpiMotorLib: ")
  #      except Exception as motor_error:
  #          print(sys.exc_info()[0])
  #          print(motor_error)
  #          print("Error : BYJMotor 103 : RpiMotorLib  : Unexpected error:")
  #      else:
  #          # print report status if everything went well
  #          if verbose:
  #              print("\nRpiMotorLib, Motor Run finished, Details:.\n")
  #              print("Motor type = {}".format(self.motor_type))
  #              print("Initial delay = {}".format(initdelay))
  #              print("GPIO pins = {}".format(gpiopins))
  #              print("Wait time = {}".format(wait))
  #              print("Number of step sequences = {}".format(steps))
  #              print("Size of step sequence = {}".format(len(step_sequence)))
  #              print("Number of steps = {}".format(steps*len(step_sequence)))
  #              display_degree()
  #              print("Counter clockwise = {}".format(direction))
  #              print("Verbose  = {}".format(verbose))
  #              print("step_type = {}".format(step_type))
  #      finally:
  #          # switch off pins at end
  #          for pin in self.PINS:
  #              pin.value =  False
