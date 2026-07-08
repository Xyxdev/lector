# Release Commands

Windows PowerShell commands from the project root:

```powershell
npm install
npm test
npm run android:sync
npm run android:debug
keytool -genkeypair -v -keystore rez-lector-release.jks -alias rezlector -keyalg RSA -keysize 2048 -validity 10000
npm run android:bundle
```

The release AAB is generated at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Create `android/keystore.properties` locally before `npm run android:bundle`:

```properties
storeFile=../rez-lector-release.jks
storePassword=TU_PASSWORD
keyAlias=rezlector
keyPassword=TU_PASSWORD
```

Do not commit `android/keystore.properties`, `.jks`, `.keystore`, passwords,
service accounts, or tokens.

If Gradle reports that Java is too old, install or select JDK 17/21 and rerun:

```powershell
java -version
npm run android:debug
npm run android:bundle
```
