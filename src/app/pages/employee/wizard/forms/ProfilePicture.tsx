import React, { useState } from 'react';
import { KTIcon } from "@metronic/helpers";

const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    imageLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
    },
    image: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      objectFit: 'cover' as React.CSSProperties['objectFit'],
      border: '1px solid #CDD4E3',
      backgroundColor: '#EEF1F7',
    },
    placeholderContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    placeholder: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: '#EEF1F7',
      border: '1px solid #CDD4E3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px',
    },
    uploadText: {
      fontFamily: 'Inter',
      fontWeight: 500,
      fontSize: '15px',
      color: '#000000',
    },
    fileInput: {
      display: 'none',
    },
  };

  interface ProfilePictureProps {
    setFile:  any;
    avatar: string;
    defaultImageUrl?: string;
  }
const ProfilePicture = ({ setFile, avatar, defaultImageUrl }: ProfilePictureProps) => {
  const [image, setImage] = useState<string | null>(avatar);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile('userProfilePicture', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImage(reader.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.imageLabel}>
        {image ? (
          <>
            <img src={image} alt="Profile" style={styles.image} />
            <p style={styles.uploadText}>Upload photo*</p>
          </>
        ) :
        (
          defaultImageUrl ? (
            <div style={styles.placeholderContainer}>
              <img src={defaultImageUrl} alt="Profile" style={styles.image} />
              <p style={styles.uploadText}>Upload photo*</p>
            </div>
          ):(
          <div style={styles.placeholderContainer}>
              <div style={styles.placeholder}>
                <KTIcon iconName='user-edit' className='fs-3x' />
              </div>
              <p style={styles.uploadText}>Upload photo*</p>
          </div>
          )
        )
        }
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={styles.fileInput}
        />
      </label>
    </div>
  );
};

export default ProfilePicture;
