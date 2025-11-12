# Email Setup for praiser.6x7.gr

This guide will help you set up email addresses like `info@praiser.6x7.gr` or `contact@praiser.6x7.gr`.

## Quick Options Overview

### ✅ **Free Options:**
1. **Zoho Mail** - Free for up to 5 users, 5GB storage per user
2. **Cloudflare Email Routing** - Free email forwarding (forwards to your existing email)
3. **papaki.com Email** - Check if your registrar offers email hosting

### 💰 **Paid Options:**
1. **Google Workspace** - $6/user/month, professional Gmail
2. **Microsoft 365** - $6/user/month, Outlook
3. **ProtonMail** - Privacy-focused, various plans

---

## Option 1: Zoho Mail (Recommended - Free!)

**Best for:** Most users, free tier available

### ⚠️ Important: Finding the Free Plan

The free plan might not be visible on the pricing page. Here's how to get it:

**Option A: Sign up directly**
- Go to [mail.zoho.com](https://mail.zoho.com)
- Click **"Sign Up"** or **"Create Account"**
- Look for **"Free Plan"** or **"Free Forever"** option
- If you only see paid plans, try the next option

**Option B: Use the free signup link**
- Go directly to: [zoho.com/mail/pricing.html](https://www.zoho.com/mail/pricing.html)
- Scroll down to find the **"Free Forever"** plan
- Or go to: [zoho.com/mail/free-email.html](https://www.zoho.com/mail/free-email.html)

**Option C: Start with trial, then switch**
- You can start with a paid plan trial
- After setup, contact Zoho support to switch to free plan
- Or cancel before trial ends and they may offer free plan

### Setup Steps:

1. **Sign up for Zoho Mail**:
   - Go to [mail.zoho.com](https://mail.zoho.com) or [zoho.com/mail](https://www.zoho.com/mail/)
   - Click "Sign Up Now" or "Create Account"
   - **Look for "Free Plan"** or "Free Forever" option
   - If you don't see it, try: [zoho.com/mail/free-email.html](https://www.zoho.com/mail/free-email.html)
   - Free plan includes: **5 users, 5GB storage each**
   - Enter your details

2. **Add your domain**:
   - After signing up, go to **Control Panel** → **Domains**
   - Click **"Add Domain"**
   - Enter: `praiser.6x7.gr`
   - Click **"Add"**

3. **Verify domain ownership**:
   - Zoho will show you DNS records to add
   - You'll need to add a **TXT record** in papaki.com:
     - **Type:** `TXT`
     - **Name/Host:** `@` (or leave blank for root domain)
     - **Value:** Zoho will provide a verification string (e.g., `zoho-verification=xxxxx`)
     - **TTL:** 3600
   - Add this in papaki.com DNS settings
   - Wait a few minutes, then click "Verify" in Zoho

4. **Configure MX records** (for receiving email):
   - Zoho will show you MX records to add
   - In papaki.com, add these MX records:
     - **Type:** `MX`
     - **Name/Host:** `@` (or leave blank)
     - **Priority:** `10` (Zoho will show the exact priority)
     - **Value/Target:** `mx.zoho.com` (Zoho will show exact value)
     - Add a second MX record with priority `20` (Zoho will show details)
   - **Important:** Remove any existing MX records first if they exist

5. **Configure SPF record** (for sending email):
   - Add a TXT record:
     - **Type:** `TXT`
     - **Name/Host:** `@`
     - **Value:** `v=spf1 include:zoho.com ~all` (Zoho will show exact value)
     - **TTL:** 3600

6. **Create email addresses**:
   - In Zoho Mail control panel, go to **Users**
   - Click **"Add User"**
   - Create addresses like:
     - `info@praiser.6x7.gr`
     - `contact@praiser.6x7.gr`
     - `hello@praiser.6x7.gr`
     - etc.

7. **Access your email**:
   - Go to [mail.zoho.com](https://mail.zoho.com)
   - Log in with your email address
   - Or use any email client (Outlook, Apple Mail, etc.)

**Cost:** FREE for up to 5 users! 🎉

---

## Option 2: Cloudflare Email Routing (Free Email Forwarding)

**Best for:** Simple forwarding to your existing email (Gmail, etc.)

### Setup Steps:

1. **Add domain to Cloudflare**:
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Add your domain `praiser.6x7.gr`
   - Change nameservers in papaki.com to Cloudflare's nameservers
   - (This moves DNS management to Cloudflare)

2. **Enable Email Routing**:
   - In Cloudflare dashboard, go to **Email** → **Email Routing**
   - Click **"Get Started"**
   - Add destination email (your Gmail, etc.)

3. **Create forwarding addresses**:
   - Create `info@praiser.6x7.gr` → forwards to `yourname@gmail.com`
   - Create `contact@praiser.6x7.gr` → forwards to `yourname@gmail.com`
   - etc.

**Note:** This only forwards emails. You can't send FROM these addresses (unless you use Cloudflare's send feature).

**Cost:** FREE! 🎉

---

## Option 3: Papaki.com Email Hosting (Native Solution)

**Best for:** If you want to keep everything with Papaki, your domain registrar

### Understanding Your DNS Setup

**What are DNS1 and DNS2?**
- `dns1.papaki.gr` and `dns2.papaki.gr` are **nameservers** - they're the servers that handle DNS queries for your domain
- Since your domain uses Papaki's nameservers, Papaki is managing your DNS
- This is normal and expected - it means all DNS changes (including email) are managed through Papaki

### Steps to Set Up Email with Papaki:

1. **Access Email Packages**:
   - Log in to [papaki.com](https://papaki.com)
   - In your domain management panel for `6x7.gr`, look for **"Πακέτα Email"** (Email Packages) in the left sidebar
   - Click on it to see available email plans

2. **Choose and Activate Email Plan**:
   - Review the available email packages (pricing varies)
   - Select a plan that fits your needs
   - Purchase/activate the email hosting service
   - Papaki will activate email hosting for your domain

3. **Configure Email Accounts**:
   - After activation, you'll be able to create email accounts
   - Look for an **"Email Accounts"** or **"Manage Email"** section
   - Create email addresses like:
     - `info@6x7.gr`
     - `contact@6x7.gr`
     - `hello@6x7.gr`
     - `admin@6x7.gr`

4. **DNS Configuration** (if needed):
   - Papaki may automatically configure MX records for you
   - If you need to add them manually:
     - Go to **"Υπηρεσία DNS"** (DNS Service) in your domain management
     - Click on **"ΓΙΑ ΠΡΟΧΩΡΗΜΕΝΟΥΣ"** (For Advanced) tab
     - Add MX records that Papaki provides (usually something like `mail.papaki.gr` or similar)
     - Papaki will show you the exact MX records to add

5. **Access Your Email**:
   - **Webmail**: Papaki usually provides a webmail interface
     - Look for a "Webmail" link or access it via `webmail.papaki.gr` or similar
     - Log in with your email address and password
   - **Email Client Setup**: Use any email client (Outlook, Apple Mail, Thunderbird, etc.)
     - **Incoming Mail (IMAP/POP3)**: Papaki will provide server details (usually `mail.papaki.gr` or `imap.papaki.gr`)
     - **Outgoing Mail (SMTP)**: Usually `smtp.papaki.gr` or `mail.papaki.gr`
     - **Ports**: Typically IMAP (143/993) and SMTP (587/465)
     - Check Papaki's email documentation for exact settings

6. **For Subdomain Email** (e.g., `info@praiser.6x7.gr`):
   - If you want email on a subdomain, you may need to:
     - Create the subdomain first (if not already done)
     - Add MX records specifically for the subdomain in DNS settings
     - Or use the root domain email and set up forwarding

**Cost:** Varies (check papaki.com pricing - usually ranges from free (basic) to €2-5/month per mailbox)

**Advantages:**
- ✅ Everything managed in one place (domain + email)
- ✅ No need to change nameservers
- ✅ Direct support from your registrar
- ✅ Usually simpler setup since DNS is already with Papaki

**Note:** If Papaki's email pricing is too high, you can still use other services (like Zoho Mail) while keeping your domain with Papaki - just add their MX records in Papaki's DNS settings.

---

## Option 4: Google Workspace (Paid - Professional)

**Best for:** Professional use, need Gmail interface

### Setup Steps:

1. **Sign up**:
   - Go to [workspace.google.com](https://workspace.google.com)
   - Choose a plan (usually $6/user/month)
   - Enter your domain: `praiser.6x7.gr`

2. **Verify domain**:
   - Add TXT record in papaki.com (Google will show you)
   - Verify ownership

3. **Configure MX records**:
   - Google will provide MX records
   - Add them in papaki.com DNS settings

4. **Create users**:
   - Create email addresses in Google Workspace admin panel

**Cost:** $6/user/month (~€5.50/month)

---

## DNS Records You'll Need to Add

Regardless of which service you choose, you'll need to add these in **papaki.com DNS settings**:

### For Receiving Email (MX Records):
```
Type: MX
Name: @ (or leave blank)
Priority: 10
Value: (provided by email service)
```

### For Sending Email (SPF Record):
```
Type: TXT
Name: @
Value: v=spf1 include:service.com ~all
```

### For Verification (TXT Record):
```
Type: TXT
Name: @
Value: (verification string from email service)
```

---

## Finding DNS Settings in papaki.com

Based on your domain management panel:

1. **Log in to papaki.com**
2. **Go to your domain `6x7.gr`**
3. **Look for**:
   - "DNS Management" or "DNS Settings"
   - "Nameservers" section
   - "DNS Records" or "Manage DNS"
4. **Add the records** your email provider shows you

---

## Recommended Setup

**For most users:** Start with **Zoho Mail (Free)** - it's the easiest and gives you full email functionality for free!

**Steps:**
1. Sign up at zoho.com/mail
2. Add domain `praiser.6x7.gr`
3. Add DNS records in papaki.com (TXT for verification, MX for receiving)
4. Create your email addresses
5. Done! ✅

---

## Common Email Addresses to Create

- `info@praiser.6x7.gr` - General inquiries
- `contact@praiser.6x7.gr` - Contact form
- `hello@praiser.6x7.gr` - Friendly contact
- `support@praiser.6x7.gr` - Support requests
- `admin@praiser.6x7.gr` - Administrative

---

## Need Help?

- **Zoho Support:** https://help.zoho.com
- **papaki.com Support:** Contact them for DNS help
- **DNS Checker:** https://dnschecker.org (to verify MX records)

---

## Quick Start (Zoho Mail)

1. ✅ Sign up: zoho.com/mail
2. ✅ Add domain: `praiser.6x7.gr`
3. ✅ Add TXT record in papaki.com (for verification)
4. ✅ Add MX records in papaki.com (for receiving email)
5. ✅ Create email addresses in Zoho
6. ✅ Start using email! 📧

**Time:** About 15-30 minutes
**Cost:** FREE! 🎉

