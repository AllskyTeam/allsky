from allskyuploadftp import ALLSKYUPLOADFTP

class ALLSKYUPLOADFTPS(ALLSKYUPLOADFTP):

	def test(self):
		return super().test(True)