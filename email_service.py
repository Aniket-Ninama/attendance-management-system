import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import os

def send_email(to_email, subject, content):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={
            "email": os.getenv("SENDER_EMAIL"),
            "name": os.getenv("SENDER_NAME")
        },
        subject=subject,
        html_content=content
    )

    try:
        api_instance.send_transac_email(email)
    except ApiException as e:
        print("Brevo email failed:", e)
