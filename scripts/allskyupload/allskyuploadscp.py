import tempfile
import getpass
import allsky_shared as allsky_shared
from allskyuploadbase import ALLSKYUPLOADBASE
import paramiko
from paramiko import AuthenticationException
from scp import SCPClient

class ALLSKYUPLOADSCP(ALLSKYUPLOADBASE):
	_temp_file_name = None
 
	def _create_temp_file(self):
		with tempfile.NamedTemporaryFile(delete=False) as temp:
			temp.write(b'Allsky test')
			self._temp_file_name = temp.name
			
	def test(self):

		host_name = self._get_settings_value('REMOTEWEBSITE_HOST')
		ftp_port = self._get_settings_value('REMOTEWEBSITE_PORT')
		user_name = self._get_settings_value('REMOTEWEBSITE_USER')
		password = self._get_settings_value('REMOTEWEBSITE_PASSWORD')
		image_directory = self._get_settings_value('remotewebsiteimagedir')
  
		ssh = paramiko.SSHClient()
		ssh.load_system_host_keys()
		try:
			self._debug_message(f'Attempting to connect using current users ({getpass.getuser()}) public key')
			ssh.connect(host_name)
		except AuthenticationException as e:    
			self._debug_message(f'Attempting to connect using username and password')
			ssh.connect(host_name, username=user_name, password=password)
      
		self._create_temp_file()
		with SCPClient(ssh.get_transport()) as scp:
			scp.put(self._temp_file_name, image_directory)

		ssh.close()    
		return True