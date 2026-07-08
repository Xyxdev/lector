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

Use JDK 17 or 21. Confirm PowerShell is using it before building:

```powershell
java -version
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -version
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

If `npm run android:bundle` fails with "Release signing is not configured",
create the local keystore and `android/keystore.properties` shown above.
