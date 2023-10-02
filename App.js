import React, { useEffect, useState, useRef, createRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Camera } from 'expo-camera';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import ClassInfo from './ClassInfo';

//import { ImageManipulator } from 'expo';

export default function App() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);

  //const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [inferedPhoto, setInferedPhoto] = useState(null);
  const [panEnabled, setPanEnabled] = useState(false);
  const [detected, setDetected] = useState(null);

  const cameraRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const pinchRef = createRef();
  const panRef = createRef();
  const sleep = ms => new Promise(r => setTimeout(r, ms));


  // Request Camera permissiosn

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');

      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus);
    })();
  }, []);


  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
      base64: true,
      width: 640,
      height: 640,
      allowsMultipleSelection: false
    });

    if (!result.canceled) {
      const base64data = result.assets[0].base64;
      processImage(base64data);
    }
  };

  const onPinchEvent = Animated.event(
    [
      {
        nativeEvent: { scale },
      },
    ],
    { useNativeDriver: true }
  );

  const onPanEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const handlePinchStateChange = ({ nativeEvent }) => {
    // enabled pan only after pinch-zoom
    if (nativeEvent.state === State.ACTIVE) {
      setPanEnabled(true);
    }

    // when scale < 1, reset scale back to original (1)
    const nScale = nativeEvent.scale;
    if (nativeEvent.state === State.END) {
      if (nScale < 1) {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

        setPanEnabled(false);
      }
    }
  };

  const processImage = async (capturedPhoto) => {
    // This function should consult the webservice sending a body like {img: base64string}
    try {
      const data = `{"img": "${capturedPhoto}" }`;
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder':
            'Aqui puede ir cualquier cosa para poder saltarse el proxy',
        },
        body: data,
      };

      await fetch('https://rude-webs-greet.loca.lt/', options)
        .then((response) => response.json())
        .then((response) => {
          if ('img' in response) {
            console.log('detections: ', response.detected.length);
            setDetected(response.detected);
            setInferedPhoto(`data:image/jpeg;base64,${response.img}`);
          }
        })
        .catch((err) => console.error('Error during fetch: ', err));
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const { uri } = await cameraRef.current.takePictureAsync();
        fetch(uri)
          .then((response) => response.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result.split(',')[1];
              // Send the base64 data to the processImage function
              processImage(base64data);
            };
            reader.readAsDataURL(blob);
          })
          .catch((error) => {
            console.error('Error in Fetch', error);
          });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleRetry = () => {
    setInferedPhoto(null);
  };

  if (hasCameraPermission === null) {
    return <View />;
  }
  if (hasCameraPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

    if (hasMediaLibraryPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to Media Library</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {inferedPhoto ? (
        <GestureHandlerRootView>
          <PanGestureHandler
            onGestureEvent={onPanEvent}
            ref={panRef}
            simultaneousHandlers={[pinchRef]}
            enabled={panEnabled}
            failOffsetX={[-1000, 1000]}
            shouldCancelWhenOutside
            >
            <View style={styles.previewContainer}>
              <PinchGestureHandler
                ref={pinchRef}
                onGestureEvent={onPinchEvent}
                simultaneousHandlers={[panRef]}
                onHandlerStateChange={handlePinchStateChange}>
                <Animated.Image
                  source={{ uri: inferedPhoto }}
                  style={{
                    flex:1,
                    width: '150%',
                    height: '150%',
                    transform: [{ scale }, { translateX }, { translateY }],
                  }}
                  resizeMode="contain"
                />
              </PinchGestureHandler>
            </View>
          </PanGestureHandler>
          <View style={styles.textContainer}>
          {detected.length > 0 ? (
              detected.map((item, index) => (
                <ClassInfo
                  key={index}
                  class_name={item.class_name}
                  color={item.color}
                  prob={item.prob}
                />
              ))
            ) : (
              <Text>No se encontraron objetos en la imagen</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleRetry} style={styles.nuevaCapturaButton}>
            <Text>Nueva captura</Text>
          </TouchableOpacity>
        </GestureHandlerRootView>
      ) : (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants.Type.back}>
          <TouchableOpacity
            onPress={handleCapture}
            style={styles.captureButton}>
            <Text>Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={selectImage} style={styles.uploadButton}>
            <Text>Subir Imagen</Text>
          </TouchableOpacity>
        </Camera>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewContainer: {
    flexDirection: 'row',
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  captureButton: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 50,
    bottom: 70,
    marginBottom: 10,
  },
  uploadButton: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 50,
    bottom: 20,
  },
  nuevaCapturaButton: {
    backgroundColor: 'cyan',
    padding: 15,
    borderRadius: 50,
    marginTop: 20,
    width: 200, 
    alignItems: 'center',
  },
});
