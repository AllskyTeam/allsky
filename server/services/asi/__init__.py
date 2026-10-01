"""Interface to ZWO ASI range of USB cameras.

Calls to the `zwoasi` module may raise :class:`TypeError` or :class:`ValueError` exceptions if an input argument
is incorrect. Failure conditions from within the module may raise exceptions of type :class:`ZWO_Error`. Errors from
conditions specifically from the SDK C library are indicated by errors of type :class:`ZWO_IOError`; certain
:func:`Camera.capture()` errors are signalled by :class:`ZWO_CaptureError`."""

import ctypes as c
from ctypes.util import find_library
import logging
import numpy as np
import sys
import time
import traceback
import logging

__author__ = 'Steve Marple'
__version__ = '0.2.0'
__license__ = 'MIT'


def get_num_cameras():
    """Retrieves the number of ZWO ASI cameras that are connected. Type :class:`int`."""
    return zwolib.ASIGetNumOfConnectedCameras()


def _get_camera_property(id_):
    prop = _ASI_CAMERA_INFO()
    r = zwolib.ASIGetCameraProperty(prop, id_)
    if r:
        raise zwo_errors[r]
    return prop.get_dict()


def _open_camera(id_):
    r = zwolib.ASIOpenCamera(id_)
    if r:
        raise zwo_errors[r]
    return


def _init_camera(id_):
    r = zwolib.ASIInitCamera(id_)
    if r:
        raise zwo_errors[r]
    return
   

def _close_camera(id_):
    r = zwolib.ASICloseCamera(id_)
    if r:
        raise zwo_errors[r]
    return


def _get_num_controls(id_):
    num = c.c_int()
    r = zwolib.ASIGetNumOfControls(id_, num)
    if r:
        raise zwo_errors[r]
    return num.value


def _get_control_caps(id_, control_index):
    caps = _ASI_CONTROL_CAPS()
    r = zwolib.ASIGetControlCaps(id_, control_index, caps)
    if r:
        raise zwo_errors[r]
    return caps.get_dict()


def _get_control_value(id_, control_type):
    value = c.c_long()
    auto = c.c_int()
    r = zwolib.ASIGetControlValue(id_, control_type, value, auto)
    if r:
        raise zwo_errors[r]
    return [value.value, bool(auto.value)]


def _set_control_value(id_, control_type, value, auto):
    r = zwolib.ASISetControlValue(id_, control_type, value, auto)
    if r:
        raise zwo_errors[r]
    return


def _get_roi_format(id_):
    roi_width = c.c_int()
    roi_height = c.c_int()
    bins = c.c_int()
    image_type = c.c_int()
    r = zwolib.ASIGetROIFormat(id_, roi_width, roi_height, bins, image_type)
    if r:
        raise zwo_errors[r]
    return [roi_width.value, roi_height.value, bins.value, image_type.value]


def _set_roi_format(id_, width, height, bins, image_type):
    cam_info = _get_camera_property(id_)

    if width < 8:
        raise ValueError('ROI width too small')
    elif width > int(cam_info['MaxWidth'] / bins):
        raise ValueError('ROI width larger than binned sensor width')
    elif width % 8 != 0:
        raise ValueError('ROI width must be multiple of 8')

    if height < 2:
        raise ValueError('ROI height too small')
    elif height > int(cam_info['MaxHeight'] / bins):
        raise ValueError('ROI width larger than binned sensor height')
    elif height % 2 != 0:
        raise ValueError('ROI height must be multiple of 2')

    if cam_info['Name'] in ['ZWO ASI120MM', 'ZWO ASI120MC'] and (width * height) % 1024 != 0:
        raise ValueError('ROI width * height must be multiple of 1024 for ' +
                         cam_info['Name'])
    r = zwolib.ASISetROIFormat(id_, width, height, bins, image_type)
    if r:
        raise zwo_errors[r]
    return


def _get_start_position(id_):
    start_x = c.c_int()
    start_y = c.c_int()
    r = zwolib.ASIGetStartPos(id_, start_x, start_y)
    if r:
        raise zwo_errors[r]
    return [start_x.value, start_y.value]


def _set_start_position(id_, start_x, start_y):
    if start_x < 0:
        raise ValueError('X start position too small')
    if start_y < 0:
        raise ValueError('Y start position too small')

    r = zwolib.ASISetStartPos(id_, start_x, start_y)
    if r:
        raise zwo_errors[r]
    return


def _get_dropped_frames(id_):
    dropped_frames = c.c_int()
    r = zwolib.ASIGetDroppedFrames(id_, dropped_frames)
    if r:
        raise zwo_errors[r]
    return dropped_frames.value

    
def _enable_dark_subtract(id_, filename):
    r = zwolib.ASIEnableDarkSubtract(id_, filename)
    if r:
        raise zwo_errors[r]
    return


def _disable_dark_subtract(id_):
    r = zwolib.ASIDisableDarkSubtract(id_)
    if r:
        raise zwo_errors[r]
    return
    

def _start_video_capture(id_):
    r = zwolib.ASIStartVideoCapture(id_)
    if r:
        raise zwo_errors[r]
    return
    

def _stop_video_capture(id_):
    r = zwolib.ASIStopVideoCapture(id_)
    if r:
        raise zwo_errors[r]
    return


def _get_video_data(id_, timeout, buffer_=None):
    if buffer_ is None:
        whbi = _get_roi_format(id_)
        sz = whbi[0] * whbi[1]
        if whbi[3] == ASI_IMG_RGB24:
            sz *= 3
        elif whbi[3] == ASI_IMG_RAW16:
            sz *= 2
        buffer_ = bytearray(sz)
    else:
        if not isinstance(buffer_, bytearray):
            raise TypeError('Supplied buffer must be a bytearray')
        sz = len(buffer_)
    
    cbuf_type = c.c_char * len(buffer_)
    cbuf = cbuf_type.from_buffer(buffer_)
    r = zwolib.ASIGetVideoData(id_, cbuf, sz, int(timeout))
    
    if r:
        raise zwo_errors[r]
    return buffer_


def _pulse_guide_on(id_, direction):
    r = zwolib.ASIPulseGuideOn(id_, direction)
    if r:
        raise zwo_errors[r]
    return


def _pulse_guide_off(id_, direction):
    r = zwolib.ASIPulseGuideOff(id_, direction)
    if r:
        raise zwo_errors[r]
    return


def _start_exposure(id_, is_dark):
    r = zwolib.ASIStartExposure(id_, is_dark)
    if r:
        raise zwo_errors[r]
    return


def _stop_exposure(id_):
    r = zwolib.ASIStopExposure(id_)
    if r:
        raise zwo_errors[r]
    return


def _get_exposure_status(id_):
    status = c.c_int()
    r = zwolib.ASIGetExpStatus(id_, status)
    if r:
        raise zwo_errors[r]
    return status.value


def _get_data_after_exposure(id_, buffer_=None):
    if buffer_ is None:
        whbi = _get_roi_format(id_)
        sz = whbi[0] * whbi[1]
        if whbi[3] == ASI_IMG_RGB24:
            sz *= 3
        elif whbi[3] == ASI_IMG_RAW16:
            sz *= 2
        buffer_ = bytearray(sz)
    else:
        if not isinstance(buffer_, bytearray):
            raise TypeError('Supplied buffer must be a bytearray')
        sz = len(buffer_)
    
    cbuf_type = c.c_char * len(buffer_)
    cbuf = cbuf_type.from_buffer(buffer_)
    r = zwolib.ASIGetDataAfterExp(id_, cbuf, sz)
    
    if r:
        raise zwo_errors[r]
    return buffer_


def _get_id(id_):
    id2 = _ASI_ID()
    r = zwolib.ASIGetID(id_, id2)
    if r:
        raise zwo_errors[r]
    return id2.get_id()


def _set_id(id_, new_id):
    id2 = _ASI_ID(new_id.encode())
    r = zwolib.ASISetID(id_, id2)
    if r:
        raise zwo_errors[r]


def _get_gain_offset(id_):
    offset_highest_DR = c.c_int()
    offset_unity_gain = c.c_int()
    gain_lowest_RN = c.c_int()
    offset_lowest_RN = c.c_int()
    r = zwolib.ASIGetGainOffset(id_, offset_highest_DR, offset_unity_gain,
                                gain_lowest_RN, offset_lowest_RN)
    if r:
        raise zwo_errors[r]
    return [offset_highest_DR.value, offset_unity_gain.value,
            gain_lowest_RN.value, offset_lowest_RN.value]


def _get_trigger_output_io_conf(id_, pin):
    bPinHigh = c.c_int()
    lDelay = c.c_long()
    lDuration = c.c_long()
    r = zwolib.ASIGetTriggerOutputIOConf(id_, pin, bPinHigh, lDelay, lDuration)

    if r:
        raise zwo_errors[r]
    return [bPinHigh.value, lDelay.value, lDuration.value]


def _set_trigger_output_io_conf(id_, pin, bPinHigh, lDelay, lDuration):
    r = zwolib.ASISetTriggerOutputIOConf(id_, pin, bPinHigh, lDelay, lDuration)

    if r:
        raise zwo_errors[r]
    return


def _get_camera_support_mode(id_):
    mode = _ASI_SUPPORTED_MODE()

    r = zwolib.ASIGetCameraSupportMode(id_, mode)
    if r:
        raise zwo_errors[r]
    return mode.get_dict()


def _get_camera_mode(id_):
    mode = c.c_int()
    r = zwolib.ASIGetCameraMode(id_, mode)
    if r:
        raise zwo_errors[r]
    return mode.value


def _set_camera_mode(id_, mode):
    r = zwolib.ASISetCameraMode(id_, mode)
    if r:
        raise zwo_errors[r]
    return


def _send_soft_trigger(id_, bStart):
    r = zwolib.ASISendSoftTrigger(id_, bStart)
    if r:
        raise zwo_errors[r]
    return



def list_cameras():
    """Retrieves model names of all connected ZWO ASI cameras. Type :class:`list` of :class:`str`."""
    r = []
    for id_ in range(get_num_cameras()):
        r.append(_get_camera_property(id_)['Name'])
    return r


class ZWO_Error(Exception):
    """Exception class for errors returned from the :mod:`zwoasi` module."""
    def __init__(self, message):
        Exception.__init__(self, message)


class ZWO_IOError(ZWO_Error):
    """Exception class for all errors returned from the ASI SDK library."""
    def __init__(self, message, error_code=None):
        ZWO_Error.__init__(self, message)
        self.error_code = error_code


class ZWO_CaptureError(ZWO_Error):
    """Exception class for when :func:`Camera.capture()` fails."""
    def __init__(self, message, exposure_status=None):
        ZWO_Error.__init__(self, message)
        self.exposure_status = exposure_status


class Camera(object):
    """Representation of ZWO ASI camera.

    The constructor for a camera object requires the camera ID number or model. The camera destructor automatically
    closes the camera."""
    def __init__(self, id_):
        if isinstance(id_, int):
            if id_ >= get_num_cameras() or id_ < 0:
                raise IndexError('Invalid id')
        elif isinstance(id_, str):
            # Find first matching camera model
            found = False
            for n in range(get_num_cameras()):
                model = _get_camera_property(n)['Name']
                if model in (id_, 'ZWO ' + id_):
                    found = True
                    id_ = n
                    break
            if not found:
                raise ValueError('Could not find camera model %s' % id_)

        else:
            raise TypeError('Unknown type for id')

        self.id = id_
        self.default_timeout = -1
        try:
            _open_camera(id_)
            self.closed = False

            _init_camera(id_)
        except Exception:
            self.closed = True
            _close_camera(id_)
            logger.error('could not open camera ' + str(id_))
            logger.debug(traceback.format_exc())
            raise
            
    def __del__(self):
        self.close()

    def get_serial_number(self, id_):
        serial = _ASI_SN()
        r = zwolib.ASIGetSerialNumber(id_, serial)
        if r:
            raise zwo_errors[r]
        return serial.get_serial_number()
            
    def get_camera_property(self):
        return _get_camera_property(self.id)

    def get_num_controls(self):
        return _get_num_controls(self.id)

    def get_controls(self):
        r = {}
        for i in range(self.get_num_controls()):
            d = _get_control_caps(self.id, i)
            r[d['Name']] = d
        return r

    def set_controls(self):
        pass

    def get_roi_format(self):
        return _get_roi_format(self.id)

    def set_roi_format(self, width, height, bins, image_type):
        _set_roi_format(self.id, width, height, bins, image_type)

    def get_roi_start_position(self):
        return _get_start_position(self.id)
        
    def set_roi_start_position(self, start_x, start_y):
        _set_start_position(self.id, start_x, start_y)

    def get_dropped_frames(self):
        return _get_dropped_frames(self.id)

    def get_camera_support_mode(self):
        return _get_camera_support_mode(self.id)

    def get_camera_mode(self):
        return _get_camera_mode(self.id)

    def set_camera_mode(self, mode):
        _set_camera_mode(self.id, mode)

    def send_soft_trigger(self, bStart):
        _send_soft_trigger(self.id, bStart)

    def set_trigger_output_io_conf(self, pin, bPinHigh, iDelay, iDuration):
        _set_trigger_output_io_conf(self.id, pin, bPinHigh, iDelay, iDuration)

    def get_trigger_output_io_conf(self, pin):
        return _get_trigger_output_io_conf(self.id, pin)
         
    def close(self):
        """Close the camera in the ASI library.

        The destructor will automatically close the camera if it has not already been closed."""
        try:
            _close_camera(self.id)
        finally:
            self.closed = True

    def get_roi(self):
        """Retrieves the region of interest (ROI).

        Returns a :class:`tuple` containing ``(start_x, start_y, width, height)``."""
        xywh = self.get_roi_start_position()
        whbi = self.get_roi_format()
        xywh.extend(whbi[0:2])
        return xywh

    def set_roi(self, start_x=None, start_y=None, width=None, height=None, bins=None, image_type=None):
        """Set the region of interest (ROI).

        If ``bins`` is not given then the current pixel binning value will be used. The ROI coordinates are considered
        after binning has been taken into account, ie if ``bins=2`` then the maximum possible height is reduced by a
        factor of two.

        If ``width=None`` or ``height=None`` then the maximum respective value will be used. The ASI SDK
        library requires that width is a multiple of 8 and height is a multiple of 2; a ValueError will be raised
        if this is not the case.

        If ``start_x=None`` then the ROI will be horizontally centred. If ``start_y=None`` then the ROI will be
        vertically centred."""
        cam_info = self.get_camera_property()
        whbi = self.get_roi_format()

        if bins is None:
            bins = whbi[2]
        elif 'SupportedBins' in cam_info and bins not in cam_info['SupportedBins']:
            raise ValueError('Illegal value for bins')

        if image_type is None:
            image_type = whbi[3]
            
        if width is None:
            width = int(cam_info['MaxWidth'] / bins)
            width -= width % 8  # Must be a multiple of 8

        if height is None:
            height = int(cam_info['MaxHeight'] / bins)
            height -= height % 2  # Must be a multiple of 2

        if start_x is None:
            start_x = int((int(cam_info['MaxWidth'] / bins) - width) / 2)
        if start_x + width > int(cam_info['MaxWidth'] / bins):
            raise ValueError('ROI and start position larger than binned sensor width')
        if start_y is None:
            start_y = int((int(cam_info['MaxHeight'] / bins) - height) / 2)
        if start_y + height > int(cam_info['MaxHeight'] / bins):
            raise ValueError('ROI and start position larger than binned sensor height')

        self.set_roi_format(width, height, bins, image_type)
        self.set_roi_start_position(start_x, start_y)

    def get_control_value(self, control_type):
        return _get_control_value(self.id, control_type)

    def set_control_value(self, control_type, value, auto=False):
        _set_control_value(self.id, control_type, value, auto)
    
    def get_bin(self):
        """Retrieves the pixel binning. Type :class:`int`.

        A pixel binning of one means no binning is active, a value of 2 indicates two pixels horizontally and two
        pixels vertically are binned."""
        return self.get_roi_format()[2]

    def start_exposure(self, is_dark=False):
        _start_exposure(self.id, is_dark)

    def stop_exposure(self):
        _stop_exposure(self.id)
        
    def get_exposure_status(self):
        return _get_exposure_status(self.id)

    def get_data_after_exposure(self, buffer_=None):
        return _get_data_after_exposure(self.id, buffer_)

    def enable_dark_subtract(self, filename):
        _enable_dark_subtract(self.id, filename)

    def disable_dark_subtract(self):
        _disable_dark_subtract(self.id)
        
    def start_video_capture(self):
        """Enable video capture mode.

        Retrieve video frames with :func:`capture_video_frame()`."""
        return _start_video_capture(self.id)
    
    def stop_video_capture(self):
        """Leave video capture mode."""
        return _stop_video_capture(self.id)

    def get_video_data(self, timeout=None, buffer_=None):
        """Retrieve a single video frame. Type :class:`bytearray`.

        Low-level function to retrieve data. See :func:`capture_video_frame()` for a more convenient method to
        acquire an image (and optionally save it)."""
        if timeout is None:
            timeout = self.default_timeout
        return _get_video_data(self.id, timeout, buffer_)

    def pulse_guide_on(self, direction):
        _pulse_guide_on(self.id, direction)
        return
    
    def pulse_guide_off(self, direction):
        _pulse_guide_off(self.id, direction)
        return

    def get_id(self):
        return _get_id(self.id)

    def set_id(self, new_id):
        _set_id(self.id, new_id)

    # Helper functions
    def get_image_type(self):
        return self.get_roi_format()[3]

    def set_image_type(self, image_type):
        whbi = self.get_roi_format()
        whbi[3] = image_type
        self.set_roi_format(*whbi)

    def capture(self, initial_sleep=0.01, poll=0.01, buffer_=None,
                filename=None):
        """Capture a still image. Type :class:`numpy.ndarray`."""
        self.start_exposure()
        if initial_sleep:
            time.sleep(initial_sleep)
        while self.get_exposure_status() == ASI_EXP_WORKING:
            if poll:
                time.sleep(poll)
            pass

        status = self.get_exposure_status()
        if status != ASI_EXP_SUCCESS:
            raise ZWO_CaptureError('Could not capture image', status)
        
        data = self.get_data_after_exposure(buffer_)
        whbi = self.get_roi_format()
        shape = [whbi[1], whbi[0]]
        if whbi[3] == ASI_IMG_RAW8 or whbi[3] == ASI_IMG_Y8:
            img = np.frombuffer(data, dtype=np.uint8)
        elif whbi[3] == ASI_IMG_RAW16:
            img = np.frombuffer(data, dtype=np.uint16)
        elif whbi[3] == ASI_IMG_RGB24:
            img = np.frombuffer(data, dtype=np.uint8)
            shape.append(3)
        else:
            raise ValueError('Unsupported image type')
        img = img.reshape(shape)

        if filename is not None:
            from PIL import Image
            mode = None
            if len(img.shape) == 3:
                img = img[:, :, ::-1]  # Convert BGR to RGB
            if whbi[3] == ASI_IMG_RAW16:
                mode = 'I;16'
            image = Image.fromarray(img, mode=mode)
            image.save(filename)
            logger.debug('wrote %s', filename)
        return img

    def capture_video_frame(self, buffer_=None, filename=None, timeout=None):
        """Capture a single frame from video. Type :class:`numpy.ndarray`.

        Video mode must have been started previously otherwise a :class:`ZWO_Error` will be raised. A new buffer
        will be used to store the image unless one has been supplied with the `buffer` keyword argument.
        If `filename` is not ``None`` the image is saved using :py:meth:`PIL.Image.Image.save()`.
        :func:`capture_video_frame()` will wait indefinitely unless a `timeout` has been given.
        The SDK suggests that the `timeout` value, in milliseconds, should be twice the exposure plus 500 ms."""
        data = self.get_video_data(buffer_=buffer_, timeout=timeout)
        whbi = self.get_roi_format()
        shape = [whbi[1], whbi[0]]
        if whbi[3] == ASI_IMG_RAW8 or whbi[3] == ASI_IMG_Y8:
            img = np.frombuffer(data, dtype=np.uint8)
        elif whbi[3] == ASI_IMG_RAW16:
            img = np.frombuffer(data, dtype=np.uint16)
        elif whbi[3] == ASI_IMG_RGB24:
            img = np.frombuffer(data, dtype=np.uint8)
            shape.append(3)
        else:
            raise ValueError('Unsupported image type')
        img = img.reshape(shape)

        if filename is not None:
            from PIL import Image
            mode = None
            if len(img.shape) == 3:
                img = img[:, :, ::-1]  # Convert BGR to RGB
            if whbi[3] == ASI_IMG_RAW16:
                mode = 'I;16'
            image = Image.fromarray(img, mode=mode)
            image.save(filename)
            logger.debug('wrote %s', filename)

        return img

    def get_control_values(self):
        controls = self.get_controls()
        r = {}
        for k in controls:
            r[k] = self.get_control_value(controls[k]['ControlType'])[0]
        return r

    def auto_exposure(self, auto=('Exposure', 'Gain')):
        controls = self.get_controls()
        r = []
        for ctrl in auto:
            if ctrl == 'BandWidth':
                continue  # auto setting is supported but is not an exposure setting
            if ctrl in controls and controls[ctrl]['IsAutoSupported']:
                self.set_control_value(controls[ctrl]['ControlType'],
                                       controls[ctrl]['DefaultValue'],
                                       auto=True)
                r.append(ctrl)
        return r

    def auto_wb(self, wb=('WB_B', 'WB_R')):
        return self.auto_exposure(auto=wb)


class _ASI_CAMERA_INFO(c.Structure):
    _fields_ = [
        ('Name', c.c_char * 64),
        ('CameraID', c.c_int),
        ('MaxHeight', c.c_long),
        ('MaxWidth', c.c_long),
        ('IsColorCam', c.c_int),
        ('BayerPattern', c.c_int),
        ('SupportedBins', c.c_int * 16),
        ('SupportedVideoFormat', c.c_int * 8),
        ('PixelSize', c.c_double),  # in um
        ('MechanicalShutter', c.c_int),
        ('ST4Port', c.c_int),
        ('IsCoolerCam', c.c_int),
        ('IsUSB3Host', c.c_int),
        ('IsUSB3Camera', c.c_int),
        ('ElecPerADU', c.c_float),
        ('BitDepth', c.c_int),
        ('IsTriggerCam', c.c_int),

        ('Unused', c.c_char * 16)
    ]
    
    def get_dict(self):
        r = {}
        for k, _ in self._fields_:
            v = getattr(self, k)
            if sys.version_info[0] >= 3 and isinstance(v, bytes):
                v = v.decode()
            r[k] = v
        del r['Unused']
        
        r['SupportedBins'] = []
        for i in range(len(self.SupportedBins)):
            if self.SupportedBins[i]:
                r['SupportedBins'].append(self.SupportedBins[i])
            else:
                break
        r['SupportedVideoFormat'] = []
        for i in range(len(self.SupportedVideoFormat)):
            if self.SupportedVideoFormat[i] == ASI_IMG_END:
                break
            r['SupportedVideoFormat'].append(self.SupportedVideoFormat[i])

        for k in ('IsColorCam', 'MechanicalShutter', 'IsCoolerCam',
                  'IsUSB3Host', 'IsUSB3Camera'):
            r[k] = bool(getattr(self, k))
        return r


class _ASI_CONTROL_CAPS(c.Structure):
    _fields_ = [
        ('Name', c.c_char * 64),
        ('Description', c.c_char * 128),
        ('MaxValue', c.c_long),
        ('MinValue', c.c_long),
        ('DefaultValue', c.c_long),
        ('IsAutoSupported', c.c_int),
        ('IsWritable', c.c_int),
        ('ControlType', c.c_int),
        ('Unused', c.c_char * 32),
        ]

    def get_dict(self):
        r = {}
        for k, _ in self._fields_:
            v = getattr(self, k)
            if sys.version_info[0] >= 3 and isinstance(v, bytes):
                v = v.decode()
            r[k] = v
        del r['Unused']
        for k in ('IsAutoSupported', 'IsWritable'):
            r[k] = bool(getattr(self, k))
        return r


class _ASI_ID(c.Structure):
    _fields_ = [('id', c.c_char * 8)]

    def get_id(self):
        # return self.id
        v = self.id
        if sys.version_info[0] >= 3 and isinstance(v, bytes):
            v = v.decode()
        return v

class _ASI_SN(c.Structure):
    _fields_ = [('sn', c.c_ubyte * 8)]

    def get_serial_number(self):
        return '{:016x}'.format(int.from_bytes(self.sn, byteorder='big'))
        


class _ASI_SUPPORTED_MODE(c.Structure):
    _fields_ = [('SupportedCameraMode', c.c_int * 16)]

    def get_dict(self):
        base_dict = {k: getattr(self, k) for k, _ in self._fields_}
        base_dict['SupportedCameraMode'] = [int(x) for x in base_dict['SupportedCameraMode']]
        return base_dict


def init(library_file=None):
    global zwolib

    if zwolib is not None:
        return # Library already initialized. do nothing

    if library_file is None:
        library_file = find_library('ASICamera2')

    if library_file is None:
        raise ZWO_Error('ASI SDK library not found')

    print(f"Trying {library_file}")
    zwolib = c.cdll.LoadLibrary(library_file)

    zwolib.ASIGetSerialNumber.argtypes = [c.c_int, c.POINTER(_ASI_SN)]
    zwolib.ASIGetSerialNumber.restype = c.c_int

    zwolib.ASIGetNumOfConnectedCameras.argtypes = []
    zwolib.ASIGetNumOfConnectedCameras.restype = c.c_int

    zwolib.ASIGetCameraProperty.argtypes = [c.POINTER(_ASI_CAMERA_INFO), c.c_int]
    zwolib.ASIGetCameraProperty.restype = c.c_int

    zwolib.ASIOpenCamera.argtypes = [c.c_int]
    zwolib.ASIOpenCamera.restype = c.c_int

    zwolib.ASIInitCamera.argtypes = [c.c_int]
    zwolib.ASIInitCamera.restype = c.c_int

    zwolib.ASICloseCamera.argtypes = [c.c_int]
    zwolib.ASICloseCamera.restype = c.c_int

    zwolib.ASIGetNumOfControls.argtypes = [c.c_int, c.POINTER(c.c_int)]
    zwolib.ASIGetNumOfControls.restype = c.c_int

    zwolib.ASIGetControlCaps.argtypes = [c.c_int, c.c_int,
                                         c.POINTER(_ASI_CONTROL_CAPS)]
    zwolib.ASIGetControlCaps.restype = c.c_int

    zwolib.ASIGetControlValue.argtypes = [c.c_int,
                                          c.c_int,
                                          c.POINTER(c.c_long),
                                          c.POINTER(c.c_int)]
    zwolib.ASIGetControlValue.restype = c.c_int

    zwolib.ASISetControlValue.argtypes = [c.c_int, c.c_int, c.c_long, c.c_int]
    zwolib.ASISetControlValue.restype = c.c_int

    zwolib.ASIGetROIFormat.argtypes = [c.c_int,
                                       c.POINTER(c.c_int),
                                       c.POINTER(c.c_int),
                                       c.POINTER(c.c_int),
                                       c.POINTER(c.c_int)]
    zwolib.ASIGetROIFormat.restype = c.c_int

    zwolib.ASISetROIFormat.argtypes = [c.c_int, c.c_int, c.c_int, c.c_int, c.c_int]
    zwolib.ASISetROIFormat.restype = c.c_int

    zwolib.ASIGetStartPos.argtypes = [c.c_int,
                                      c.POINTER(c.c_int),
                                      c.POINTER(c.c_int)]
    zwolib.ASIGetStartPos.restype = c.c_int

    zwolib.ASISetStartPos.argtypes = [c.c_int, c.c_int, c.c_int]
    zwolib.ASISetStartPos.restype = c.c_int

    zwolib.ASIGetDroppedFrames.argtypes = [c.c_int, c.POINTER(c.c_int)]
    zwolib.ASIGetDroppedFrames.restype = c.c_int

    zwolib.ASIEnableDarkSubtract.argtypes = [c.c_int, c.POINTER(c.c_char)]
    zwolib.ASIEnableDarkSubtract.restype = c.c_int

    zwolib.ASIDisableDarkSubtract.argtypes = [c.c_int]
    zwolib.ASIDisableDarkSubtract.restype = c.c_int

    zwolib.ASIStartVideoCapture.argtypes = [c.c_int]
    zwolib.ASIStartVideoCapture.restype = c.c_int

    zwolib.ASIStopVideoCapture.argtypes = [c.c_int]
    zwolib.ASIStopVideoCapture.restype = c.c_int

    zwolib.ASIGetVideoData.argtypes = [c.c_int,
                                       c.POINTER(c.c_char),
                                       c.c_long,
                                       c.c_int]
    zwolib.ASIGetVideoData.restype = c.c_int

    zwolib.ASIPulseGuideOn.argtypes = [c.c_int, c.c_int]
    zwolib.ASIPulseGuideOn.restype = c.c_int

    zwolib.ASIPulseGuideOff.argtypes = [c.c_int, c.c_int]
    zwolib.ASIPulseGuideOff.restype = c.c_int

    zwolib.ASIStartExposure.argtypes = [c.c_int, c.c_int]
    zwolib.ASIStartExposure.restype = c.c_int

    zwolib.ASIStopExposure.argtypes = [c.c_int]
    zwolib.ASIStopExposure.restype = c.c_int

    zwolib.ASIGetExpStatus.argtypes = [c.c_int, c.POINTER(c.c_int)]
    zwolib.ASIGetExpStatus.restype = c.c_int

    zwolib.ASIGetDataAfterExp.argtypes = [c.c_int, c.POINTER(c.c_char), c.c_long]
    zwolib.ASIGetDataAfterExp.restype = c.c_int

    zwolib.ASIGetID.argtypes = [c.c_int, c.POINTER(_ASI_ID)]
    zwolib.ASIGetID.restype = c.c_int

    zwolib.ASISetID.argtypes = [c.c_int, _ASI_ID]
    zwolib.ASISetID.restype = c.c_int


    zwolib.ASIGetGainOffset.argtypes = [c.c_int,
                                        c.POINTER(c.c_int),
                                        c.POINTER(c.c_int),
                                        c.POINTER(c.c_int),
                                        c.POINTER(c.c_int)]
    zwolib.ASIGetGainOffset.restype = c.c_int

    zwolib.ASISetCameraMode.argtypes = [c.c_int, c.c_int]
    zwolib.ASISetCameraMode.restype = c.c_int

    zwolib.ASIGetCameraMode.argtypes = [c.c_int, c.POINTER(c.c_int)]
    zwolib.ASIGetCameraMode.restype = c.c_int

    zwolib.ASIGetCameraSupportMode.argtypes = [c.c_int, c.POINTER(_ASI_SUPPORTED_MODE)]
    zwolib.ASIGetCameraSupportMode.restype = c.c_int

    zwolib.ASISendSoftTrigger.argtypes = [c.c_int, c.c_int]
    zwolib.ASISendSoftTrigger.restype = c.c_int

    zwolib.ASISetTriggerOutputIOConf.argtypes = [c.c_int,
                                                 c.c_int,
                                                 c.c_int,
                                                 c.c_long,
                                                 c.c_long]
    zwolib.ASISetTriggerOutputIOConf.restype = c.c_int

    zwolib.ASIGetTriggerOutputIOConf.argtypes = [c.c_int,
                                                 c.c_int,
                                                 c.POINTER(c.c_int),
                                                 c.POINTER(c.c_long),
                                                 c.POINTER(c.c_long)]
    zwolib.ASIGetTriggerOutputIOConf.restype = c.c_int



logger = logging.getLogger(__name__)

# ASI_BAYER_PATTERN
ASI_BAYER_RG = 0
ASI_BAYER_BG = 1
ASI_BAYER_GR = 2
ASI_BAYER_RB = 3

# ASI_IMGTYPE
ASI_IMG_RAW8 = 0
ASI_IMG_RGB24 = 1
ASI_IMG_RAW16 = 2
ASI_IMG_Y8 = 3
ASI_IMG_END = -1

# ASI_GUIDE_DIRECTION
ASI_GUIDE_NORTH = 0
ASI_GUIDE_SOUTH = 1
ASI_GUIDE_EAST = 2
ASI_GUIDE_WEST = 3

ASI_GAIN = 0
ASI_EXPOSURE = 1
ASI_GAMMA = 2
ASI_WB_R = 3
ASI_WB_B = 4
ASI_BRIGHTNESS = 5
ASI_OFFSET = 5
ASI_BANDWIDTHOVERLOAD = 6
ASI_OVERCLOCK = 7
ASI_TEMPERATURE = 8  # return 10*temperature
ASI_FLIP = 9
ASI_AUTO_MAX_GAIN = 10
ASI_AUTO_MAX_EXP = 11
ASI_AUTO_MAX_BRIGHTNESS = 12
ASI_HARDWARE_BIN = 13
ASI_HIGH_SPEED_MODE = 14
ASI_COOLER_POWER_PERC = 15
ASI_TARGET_TEMP = 16  # not need *10
ASI_COOLER_ON = 17
ASI_MONO_BIN = 18  # lead to less grid at software bin mode for color camera
ASI_FAN_ON = 19
ASI_PATTERN_ADJUST = 20

# ASI_CAMERA_MODE
ASI_MODE_NORMAL = 0 
ASI_MODE_TRIG_SOFT_EDGE = 1
ASI_MODE_TRIG_RISE_EDGE = 2
ASI_MODE_TRIG_FALL_EDGE = 3
ASI_MODE_TRIG_SOFT_LEVEL = 4
ASI_MODE_TRIG_HIGH_LEVEL = 5
ASI_MODE_TRIG_LOW_LEVEL = 6
ASI_MODE_END = -1

# ASI_TRIG_OUTPUT
ASI_TRIG_OUTPUT_PINA = 0
ASI_TRIG_OUTPUT_PINB = 1
ASI_TRIG_OUTPUT_NONE = -1


# ASI_EXPOSURE_STATUS
ASI_EXP_IDLE = 0
ASI_EXP_WORKING = 1
ASI_EXP_SUCCESS = 2
ASI_EXP_FAILED = 3


# Mapping of error numbers to exceptions. Zero is used for success.
zwo_errors = [None,
              ZWO_IOError('Invalid index', 1),
              ZWO_IOError('Invalid ID', 2),
              ZWO_IOError('Invalid control type', 3),
              ZWO_IOError('Camera closed', 4),
              ZWO_IOError('Camera removed', 5),
              ZWO_IOError('Invalid path', 6),
              ZWO_IOError('Invalid file format', 7),
              ZWO_IOError('Invalid size', 8),
              ZWO_IOError('Invalid image type', 9),
              ZWO_IOError('Outside of boundary', 10),
              ZWO_IOError('Timeout', 11),
              ZWO_IOError('Invalid sequence', 12),
              ZWO_IOError('Buffer too small', 13),
              ZWO_IOError('Video mode active', 14),
              ZWO_IOError('Exposure in progress', 15),
              ZWO_IOError('General error', 16),
              ZWO_IOError('Invalid mode', 17)
              ]

zwolib = None
try:
    init() # Initialize library on import, will only run once.
except ZWO_Error as e:
    logger.warning(str(e))