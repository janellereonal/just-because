# AWS EC2

EC2 runs the same Linux Docker Compose stack as a VPS. The main differences are AWS networking, instance access, and billing.

## Create and secure an instance

1. Launch a supported Linux AMI in the region you want. Choose an instance size based on expected traffic; check current EC2 and storage pricing before launch.
2. Create or select a key pair and keep the private key in a secure location outside the repository.
3. Attach a security group with inbound TCP `80` and `443` for the public site. Restrict SSH (`22`) to your current public IP, or use Systems Manager Session Manager.
4. Assign an Elastic IP if you need a stable IPv4 address, then point the docs hostname's DNS `A` record to it. Configure IPv6 and an `AAAA` record only if you intend to serve IPv6.
5. Connect with the AMI's documented username and your key. For example, Ubuntu images commonly use `ubuntu`; Amazon Linux commonly uses `ec2-user`.

See AWS's current guides for [launching an EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html), [connecting to Linux](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html), and [key pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html). Keep SSH scoped to your own IP; never commit a private key.

## Deploy

Install Docker Engine and its Compose plugin for the selected Linux distribution using the [official Docker installation guide](https://docs.docker.com/engine/install/). Clone or copy the repository to the instance, then follow [VPS with Docker](/hosting/vps-docker#start-the-site) from the `doc/wiki/` directory. Set `DOCS_DOMAIN`, run `docker compose up -d --build`, and confirm the site loads over HTTPS.

## Costs and cleanup

EC2 instances, attached storage, Elastic IP allocations, data transfer, and related resources can incur charges. Review the current AWS pricing for the chosen region and set a billing budget or alert. When the host is no longer needed, stop or terminate the instance and review its volumes, snapshots, addresses, and security group so unused resources do not remain.
