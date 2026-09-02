import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';
import {getInitials} from '../../utils/helpers';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  backgroundColor?: string;
}

export function Avatar({
  name,
  imageUrl,
  size = 40,
  backgroundColor = colors.primaryLight,
}: AvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
  };

  const textStyle = {
    fontSize: size * 0.4,
  };

  if (imageUrl) {
    return (
      <Image
        source={{uri: imageUrl}}
        style={[styles.image, containerStyle]}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle]} accessibilityLabel={`${name}'s avatar`}>
      <Text style={[styles.initials, textStyle]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
