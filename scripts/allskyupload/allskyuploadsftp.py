import io
import allsky_shared as allsky_shared
from allskyuploadbase import ALLSKYUPLOADBASE
import paramiko


class ALLSKYUPLOADSFTP(ALLSKYUPLOADBASE):

	def _test_sftp_command(self, use_ftps=False, change_directory=False, directory='', save_file=False, delete_file=False, save_file_text=None, save_filename=None, remote_filename=None, file_is_binary=False):
		result = True

		host_name = self._get_settings_value('REMOTEWEBSITE_HOST')
		ftp_port = self._get_settings_value('REMOTEWEBSITE_PORT')
		user_name = self._get_settings_value('REMOTEWEBSITE_USER')
		password = self._get_settings_value('REMOTEWEBSITE_PASSWORD')

		if not ftp_port:
			ftp_port = 22
   
		ftp_port = int(ftp_port)
		try:
			# Create an SFTP transport
			transport = paramiko.Transport((host_name, ftp_port))
			transport.connect(username=user_name, password=password)

			# Create an SFTP client from the transport
			sftp = paramiko.SFTPClient.from_transport(transport)
    
			if change_directory:
				sftp.chdir(directory)

			if save_file:
				if save_filename is not None:
					file_object = open(save_filename, 'rb')
				else:
					file_object = io.BytesIO(save_file_text.encode('utf-8'))
	
				response = sftp.putfo(file_object, remote_filename)
     
			if delete_file:
				sftp.remove(remote_filename)

			sftp.close()
			transport.close()
			result = True
		except Exception as e:
			result = False
			message = f'Error on the sftp server {e}'
			self._add_result(message, self._ERROR, 300)
					
		return result


	def test(self):
		result = False
		if self._check_ftp_settings():
			self._debug_message('Checking ability to connect and login')
			if self._test_sftp_command():
				image_directory = self._get_settings_value('remotewebsiteimagedir')
				self._debug_message(f'Checking remote image directory {image_directory} exists')
				if self._test_sftp_command(change_directory=True, directory=image_directory):
					self._debug_message('Checking ability to upload a file')        
					if self._test_sftp_command(change_directory=True, directory=image_directory, save_file=True, save_file_text='test data', remote_filename='test.txt'):
						self._debug_message('Checking ability to delete a file')
						if self._test_sftp_command(change_directory=True, directory=image_directory, delete_file=True, remote_filename='test.txt'):
							result = True
						else:
							message = f'Deleting a file to the remote server failed. Please check the servers permissions'
							self._add_result(message, self._ERROR, 110)
					else:
						message = f'Saving a file to the remote server failed. Please check the servers permissions and Image Directory in the main Allsky Settings'
						self._add_result(message, self._ERROR, 110)
				else:
					message = f'Changing to the {image_directory} failed. Please check the directory exists and the Allsky settings are correct'
					self._add_result(message, self._ERROR, 110)     
			else:
				message = f'Connecting to the ftp server failed. Please check the Server Name and login credentials in the main Allsky settings'
				self._add_result(message, self._ERROR, 110)
     
		return result 