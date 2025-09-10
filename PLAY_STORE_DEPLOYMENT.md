# Play Store Deployment Guide for Haritech VoIP App

## Prerequisites Completed ✅
- App configuration updated
- Signing configuration added
- Build files prepared

## Step-by-Step Deployment Process

### 1. Generate Release Keystore
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore haritech-release-key.keystore -alias haritech-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: 
- Choose a strong password and remember it
- Store the keystore file safely (you'll need it for future updates)
- Update the passwords in `android/gradle.properties`

### 2. Update Keystore Passwords
Edit `android/gradle.properties` and replace:
```
MYAPP_RELEASE_STORE_PASSWORD=your_actual_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_actual_key_password
```

### 3. Update App Version (Optional)
In `android/app/build.gradle`, update version for new releases:
```gradle
versionCode 2        // Increment for each release
versionName "1.1"    // Update version name
```

### 4. Generate Release Bundle (AAB - Recommended)
```bash
cd android
./gradlew bundleRelease
```

**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Alternative: Generate APK
```bash
cd android
./gradlew assembleRelease
```

**Output**: `android/app/build/outputs/apk/release/app-release.apk`

### 6. Test Release Build
```bash
# Install release APK on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Test thoroughly**:
- VoIP calling functionality
- Audio quality
- App permissions
- Network connectivity
- All screens and features

### 7. Play Store Console Setup

1. **Create Developer Account**: https://play.google.com/console
2. **Pay $25 registration fee** (one-time)
3. **Create new app** in Play Console

### 8. App Store Listing Requirements

#### Required Assets:
- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG  
- **Screenshots**: At least 2 phone screenshots
- **Privacy Policy URL** (required for apps with permissions)

#### App Information:
- **App Name**: "Haritech VoIP Dialer"
- **Short Description**: 50 characters max
- **Full Description**: Up to 4000 characters
- **Category**: Communication
- **Content Rating**: Complete questionnaire

#### Permissions Justification:
Your app uses sensitive permissions that need explanation:
- `CALL_PHONE`: For making VoIP calls
- `RECORD_AUDIO`: For voice communication
- `READ_PHONE_STATE`: For call management
- `PROCESS_OUTGOING_CALLS`: For VoIP functionality

### 9. Upload to Play Console

1. Go to **Release > Production**
2. Click **Create new release**
3. Upload your **AAB file** (recommended) or APK
4. Add **Release notes**
5. Review and **Save**

### 10. Content Rating & Policies

1. Complete **Content Rating questionnaire**
2. Add **Privacy Policy** (required)
3. Review **Target audience** settings
4. Complete **Data safety** section

### 11. Review & Publish

1. Go to **Publishing overview**
2. Address any **issues** flagged
3. Click **Send for review**

**Review time**: Usually 1-3 days for new apps

## Important Notes

### Security Considerations:
- Never commit keystore files to version control
- Store keystore passwords securely
- Keep backup of keystore file

### App Updates:
- Always use same keystore for updates
- Increment `versionCode` for each update
- Update `versionName` appropriately

### VoIP App Specific:
- Test thoroughly on different networks
- Ensure audio permissions work correctly
- Verify SIP registration functionality
- Test incoming/outgoing calls

### Common Issues:
- **64-bit requirement**: Ensure ARM64 support (already configured)
- **Target API level**: Update if Google requires newer API
- **Permissions**: Justify all dangerous permissions

## Files Modified:
- ✅ `android/gradle.properties` - Added keystore configuration
- ✅ `android/app/build.gradle` - Updated signing configuration

## Next Steps:
1. Generate keystore with strong password
2. Update passwords in gradle.properties
3. Build release AAB/APK
4. Test thoroughly on physical device
5. Create Play Store listing
6. Upload and submit for review
