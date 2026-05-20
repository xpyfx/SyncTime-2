import React from 'react';
import { ProfilePage } from './Profile';

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
  onChatOpen: (roomId: string) => void;
  onTripClick: (tripId: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ userId, onBack, onChatOpen, onTripClick }) => {
  return (
    <ProfilePage 
      targetUserId={userId}
      onBack={onBack}
      onMyPostsClick={() => {}} 
      onTripClick={onTripClick}
      onChatClick={onChatOpen}
    />
  );
};
