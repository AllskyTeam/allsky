import io
import allsky_shared as allsky_shared
from allskyuploadbase import ALLSKYUPLOADBASE
from ftplib import FTP, FTP_TLS, error_perm, error_temp, error_proto, error_reply

class ALLSKYUPLOADFTP(ALLSKYUPLOADBASE):

	def _test_ftp_command(self, use_ftps=False, change_directory=False, directory='', save_file=False, delete_file=False, save_file_text=None, save_filename=None, remote_filename=None, file_is_binary=False):
		result = False
		command = None
		host_name = self._get_settings_value('REMOTEWEBSITE_HOST')
		ftp_port = self._get_settings_value('REMOTEWEBSITE_PORT')
		user_name = self._get_settings_value('REMOTEWEBSITE_USER')
		password = self._get_settings_value('REMOTEWEBSITE_PASSWORD')

		if not ftp_port:
			ftp_port = 21
         
		try:
			if use_ftps:
				ftp=FTP_TLS()
			else:
				ftp = FTP()
			
			if self._in_debug_mode():
				ftp.set_debuglevel(2)    
			ftp.connect(host_name, int(ftp_port), 5)
			ftp.login(user_name, password)
   
			if use_ftps:
				ftp.prot_p()

   
			if change_directory:
				command = f'cwd {directory}'
				response = ftp.sendcmd(command)

			if save_file:
				if save_filename is not None:
					file_object = open(save_filename, 'rb')
				else:
					file_object = io.BytesIO(save_file_text.encode('utf-8'))
				if file_is_binary:
					response = ftp.storbinary(f'STOR {remote_filename}', file_object)
				else:
					response = ftp.storlines(f'STOR {remote_filename}', file_object)
     
			if delete_file:
				ftp.delete(remote_filename)
    
			ftp.quit()
			result = True
		except (error_perm, error_temp, error_proto, error_reply) as e:
			error_code = str(e).split()[0]
			if command is None:
				message = f'FTP connection failed due to a login error, error code {error_code}. Either the username "{user_name}" or password are incorrect'
				self._add_result(message, self._ERROR, 110)
		except Exception as e:
			print(e)
			message = f'FTP connection failed. Most likely the Server Name "{host_name}" is incorrect/inaccessible or the ftp port {ftp_port} is incorrect'
			self._add_result(message, self._ERROR, 110)
		
		return result

	def test(self, use_ftps=False):
		result = False
		if self._check_ftp_settings():
			self._debug_message('Checking ability to connect and login')      
			if self._test_ftp_command(use_ftps=use_ftps):
				image_directory = self._get_settings_value('remotewebsiteimagedir')
				self._debug_message(f'Checking remote image directory {image_directory} exists')    
				if self._test_ftp_command(use_ftps=use_ftps, change_directory=True, directory=image_directory):
					self._debug_message('Checking ability to upload a file')            
					if self._test_ftp_command(use_ftps=use_ftps, change_directory=True, directory=image_directory, save_file=True, save_file_text='test data', remote_filename='test.txt'):
						self._debug_message('Checking ability to delete a file')         
						if self._test_ftp_command(use_ftps=use_ftps, change_directory=True, directory=image_directory, delete_file=True, remote_filename='test.txt'):
							result = True
						else:
							message = f'Deleting a file to the remote server failed. Please check the servers permissions'
							self._add_result(message, self._ERROR, 110)
					else:
						message = f'Saving a file to the remote server failed. Please check the servers permissions'
						self._add_result(message, self._ERROR, 110)
				else:
					message = f'Changing to the {image_directory} failed. Please check the directory exists and the Allsky settings are correct'
					self._add_result(message, self._ERROR, 110)
			else:
				message = f'Connecting to the ftp server failed. Please check the protocol and Server Name settings'
				self._add_result(message, self._ERROR, 110)

		return result 

	def upload(self):
		pass

	def delete(self):
		pass

	def mirror(self):
		pass