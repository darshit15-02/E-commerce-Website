import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { OTP } from "@/models/otp";
import { getServerSession } from "next-auth";
import { mongo } from "mongoose";
import { mongooseConnect } from "@/lib/mongoose";
import { EMAIL_VERIFY_TEMPLATE } from "../../(pages)/EmailTemplates/emailTemplates";



export async function POST(request: Request) {
  try {
    await mongooseConnect();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // check if an otp has already been generated for the email
    const existingOtp = await OTP.findOne({ email });
    if (existingOtp) {

      await OTP.deleteOne({ email }); //
    }

    // Generate a random 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Save the OTP in the database
    const response = await OTP.create({
      email,
      otp,
      expiry: otpExpiry,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, 
      port: Number(process.env.EMAIL_PORT), 
      secure: true, 
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD, 
      },
      logger: true,
      debug: true,
    });



    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "OTP for account verification",
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", email)
    };


    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      {
        message: "Message sent successfully",
        otp: response.otp,
        expiry: response.expiry,
      },
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse("Failed to send message.", { status: 500 });
  }
}
