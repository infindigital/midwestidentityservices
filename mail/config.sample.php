<?php
/**
 * Midwest Identity Services: contact form mail configuration (template)
 * ---------------------------------------------------------------------------
 * Sender:    smtpinfin@gmail.com (a Gmail the developer controls)
 * Recipient: moservices.midwest@gmail.com (the client's inbox, no password needed)
 *
 * TEMPLATE. Copy this file to mail/config.php ON THE WEB SERVER and paste the
 * Gmail App Password for smtpinfin@gmail.com into SMTP_PASS.
 *
 * mail/config.php is deliberately git-ignored so the password is never
 * committed. Create the App Password at myaccount.google.com, under Security,
 * 2-Step Verification, App passwords. Never commit the filled-in file.
 * ---------------------------------------------------------------------------
 */

return [
    // --- SMTP transport (the sender) --------------------------------------
    'SMTP_HOST'   => 'smtp.gmail.com',
    'SMTP_PORT'   => 587,
    'SMTP_SECURE' => 'tls',            // 'tls' for 587, 'ssl' for 465
    'SMTP_USER'   => 'smtpinfin@gmail.com',
    'SMTP_PASS'   => '',               // 16-character Gmail App Password. Fill in on the server only.

    // --- Addresses -------------------------------------------------------
    'MAIL_TO'      => 'moservices.midwest@gmail.com',
    'MAIL_TO_NAME' => 'Midwest Identity Services',

    'SMTP_FROM'      => 'smtpinfin@gmail.com',   // must match SMTP_USER
    'SMTP_FROM_NAME' => 'Midwest Identity Services Website',

    // --- Behaviour -------------------------------------------------------
    'SMTP_DEBUG'   => false,           // true only while troubleshooting; output goes to the PHP error log
    'ALLOW_ORIGIN' => '',              // '' = same site only; set to the live https:// address if the form is posted from another domain
];
