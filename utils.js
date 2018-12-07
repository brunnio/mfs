import { AsyncStorage, Platform } from 'react-native';
import { NavigationActions } from 'react-navigation';
import SInfo from 'react-native-sensitive-info';
import RNFetchBlob from 'react-native-fetch-blob';
import * as actions from './modules/auth/actions';
import * as api from './modules/auth/api';



module.exports = {

	
	uploadImage: (uri, mime = 'application/octet-stream', currentImageIndexBeingUploaded, callback) => {

		const Blob = RNFetchBlob.polyfill.Blob;
		window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest;
		window.Blob = Blob;

		return new Promise((resolve, reject) => {
			const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri
			const sessionId = new Date().getTime()
			let uploadBlob = null;

			// Grab reference to firebase storage
			const imageRef = api.storage.ref('images').child(store.getState().userReducer.userInfo.uid).child(`${currentImageIndexBeingUploaded}`);


			RNFetchBlob.fs.readFile(uploadUri, 'base64')
				.then((data) => {
					return Blob.build(data, { type: `${mime};BASE64` })
				})
				.then((blob) => {
					uploadBlob = blob
					return imageRef.put(blob, { contentType: mime })
				})
				.then(() => {
					uploadBlob.close();

					return imageRef.getDownloadURL()
				})
				.then((url) => {
					
					// dispatch a redux action
					store.dispatch(actions.savePicURL(store.getState().userReducer.userInfo.uid, url, currentImageIndexBeingUploaded, () => {
						callback();

					}));

				})
				.catch((error) => {
					reject(error)
				})
		});
	},

	// https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html
	makeCancelable: (promise) => {
		let hasCanceled_ = false;

		const wrappedPromise = new Promise((resolve, reject) => {
			promise.then(
				val => hasCanceled_ ? reject({ isCanceled: true }) : resolve(val),
				error => hasCanceled_ ? reject({ isCanceled: true }) : reject(error)
			);
		});

		return {
			promise: wrappedPromise,
			cancel() {
				hasCanceled_ = true;
			},
		};
	},

	resetTo: function (navigation, route) {

		// Note, if we navigate to index:0, the leftHeader won't show up, its a bug that hasnt been fixed in react navigation as of 25/05/2018

		const actionToDispatch = NavigationActions.reset({
			// notice the index set to 1, to indicate that we must go to the screen on top of the cardstack
			//index: 1,
			index: 0,
			key: null,
			actions: [
				// this will reset to any route and have the cardstack below it
				//NavigationActions.navigate({ routeName: 'CardStack' }),
				NavigationActions.navigate({ routeName: route }),
			],
		});

		navigation.dispatch(actionToDispatch);
	},

	checkForLogin: function (navigation, navigatorRef) {

		let email = '';
		let password = '';

		let getEmail = SInfo.getItem('email', {
			sharedPreferencesName: 'myMFSSharedPrefs',
			keychainService: 'myMFSKeychain',
		}).then(emailValue => {
			email = emailValue;
		});

		let getPassword = SInfo.getItem('password', {
			sharedPreferencesName: 'myMFSSharedPrefs',
			keychainService: 'myMFSKeychain',
		}).then(passwordValue => {
			password = passwordValue;
		});

		Promise.all([getEmail, getPassword]).then(() => {

			// if there is an user logged in
			if (store.getState().userReducer.userInfo) {

				store.dispatch(actions.reloadUserFirebase((data) => {

					module.exports.afterLogin(navigation, navigatorRef);

				}, (error) => {

					////console.warn('error reloading: '+JSON.stringify(error));

				}));

			}
			else // no user logged in, log in 
			{
				if (name == '' || password == '')
					return;

				//console.warn('no user already logged in');
				store.dispatch(actions.login({ email: email, password: password },

					// Success callback
					(data) => {

						store.dispatch(actions.reloadUserFirebase((data) => {

							//console.warn('reloaded');
							module.exports.afterLogin(navigation, navigatorRef);


						}, (error) => {


						}));

					}, (error) => {


					}));
			}


		});

	},

	redirectFromSavedData: function ({ navigation, onboardingCompleted }) {

		// Take user to the last saved onboarding step
		(async () => {
			try {

				const value = await AsyncStorage.getItem('lastScreenVisited');
				if (value !== null) {
					
					if (value.substring(0, 4) == 'sign') {
						navigation.navigate(value);
					}
					else // else it means the last saved state is either login or home, go to the first step in the onboarding
					{
						navigation.navigate('SignUpInfoGender');
					}
				}
				else {
					//console.warn('lastScreenVisited is null');
				}


			} catch (error) {
				
			}
		})();
	}
};