Neon for postgres
Redis cloud for redis
cloudamqp for rabbitmq
smtp from mailgun


update: 15th night - register,login,logout
register email not working
check the errors. errors are not handled properly. they are all giving internal server error and not a proper response.
service is fine. fix the controller codes.

update 16th 2pm :
email fixed
register errors handled perfectly
removed queues and embed all the logic in notificationservice file.
added country, phone number and admin,performer,eventmanager roles, with proper validation on input.

update 16th 10pm:
login and logout errors handled properly.

11pm:
auth routes done.

update: 17th 3:30pm
aws files integrated- api keys missing - might need to switch to cloudinary
4 new items in the user model implemented and working properly.


update: 6:30pm
***The signed URLs will expire after the specified time (1 hour by default). You might want to implement URL refresh logic in your frontend***
this is for the cloudinary private uploads.

update: 7pm
cloudinary working.
can't sent social media links in form data. so had to skip that in latest test (but it has been tested earlier)