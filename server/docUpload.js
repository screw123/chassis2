
Slingshot.fileRestrictions("docUpload", {
	allowedFileTypes: null,
	maxSize: 5 * 1024 * 1024
});

Slingshot.createDirective("docUpload", Slingshot.S3Storage, {
	AWSAccessKeyId: Meteor.settings.private.AWSAccessKeyId,
	AWSSecretAccessKey: Meteor.settings.private.AWSSecretAccessKey,
	bucket: "meteortest1",
	acl: "public-read",
	region: Meteor.settings.private.AWSRegion,

	authorize: function () {
		return true;
	},

	key: function (file, meta) {

		return meta.module + "." +Math.random().toString(36).substr(2, 20) + "." + file.name.substr((~-file.name.lastIndexOf(".") >>> 0) + 2);
	}

});
