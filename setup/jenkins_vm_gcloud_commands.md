For Hanging VMs connect via IAP
gcloud compute ssh authentication-vm \
 --zone=us-central1-a \
 --project=city-tales-authentication \
 --tunnel-through-iap

1. sudo apt install openjdk-17-jdk -y [Install Java 17]
2. sudo rm -f /etc/apt/sources.list.d/jenkins.list
3. sudo rm -f /usr/share/keyrings/jenkins-keyring.asc [Remove any existing Jenkins]
4. curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | sudo tee \
   /usr/share/keyrings/jenkins-keyring.asc > /dev/null
5. echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | \
   sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
6. sudo apt update
7. sudo apt install jenkins -y [Install Jenkins]

** Steps to override jenkins port **
sudo mkdir -p /etc/systemd/system/jenkins.service.d
sudo nano /etc/systemd/system/jenkins.service.d/override.conf

```
[Service]
ExecStart=
ExecStart=/usr/bin/java -Djava.awt.headless=true -jar /usr/share/java/jenkins.war --httpPort=8000
```

[CTRL + O -> Enter -> CTRL + X]

Tag VM for Jenkins server access
[
gcloud compute instances add-tags authentication-vm \
 --tags=jenkins-server \
 --zone=us-central1-a
]

8. sudo systemctl daemon-reload [Reload]
9. Run on Cloud Shell and Give VM Port 8080 access
   [
   gcloud compute firewall-rules create allow-jenkins-8000 \
    --allow tcp:8000 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=jenkins-server
   ]
10. sudo systemctl restart jenkins [Restart Jenkins Server]
11. sudo systemctl status jenkins -l [Check Jenkins Server]
12. sudo cat /var/lib/jenkins/secrets/initialAdminPassword [Get Jenkins Initial Password]
13. Install BlueOcean, Git, Pipeline Stage View
