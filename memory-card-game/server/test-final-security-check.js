const axios = require("axios");

const BASE_URL = "http://localhost:3001/api";

async function testFinalSecurityCheck() {
  try {
    // Test 1: Verify weak password rejection
    const weakPasswords = ["password", "123456", "qwerty", "abc123"];
    let allWeakPasswordsRejected = true;

    for (const weakPassword of weakPasswords) {
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          username: "weak_test_" + Date.now(),
          email: `weak${Date.now()}@test.com`,
          password: weakPassword,
        });
        allWeakPasswordsRejected = false;
      } catch (error) {
        if (error.response?.status === 400) {
          } else {
          }
      }
    }

    if (allWeakPasswordsRejected) {
      }

    // Test 2: Verify password complexity requirements
    const testCases = [
      { password: "short", expected: false, description: "Too short" },
      {
        password: "onlyletters",
        expected: false,
        description: "No numbers or special chars",
      },
      {
        password: "only123",
        expected: false,
        description: "No letters or special chars",
      },
      {
        password: "only@#$",
        expected: false,
        description: "No letters or numbers",
      },
      {
        password: "letters123",
        expected: false,
        description: "No special characters",
      },
      { password: "letters@#$", expected: false, description: "No numbers" },
      { password: "123@#$", expected: false, description: "No letters" },
      {
        password: "ValidPass1!",
        expected: true,
        description: "Valid password",
      },
      {
        password: "Secure123@",
        expected: true,
        description: "Another valid password",
      },
    ];

    for (const testCase of testCases) {
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          username: "complex_test_" + Date.now(),
          email: `complex${Date.now()}@test.com`,
          password: testCase.password,
        });

        if (testCase.expected) {
          } else {
          }
      } catch (error) {
        if (error.response?.status === 400) {
          if (testCase.expected) {
            } else {
            }
        } else {
          }
      }
    }

    // Test 3: Verify email/username login functionality
    const testUser = {
      username: "final_test_" + Date.now(),
      email: `final${Date.now()}@test.com`,
      password: "SecurePass123!",
    };

    // Register user
    const registerResponse = await axios.post(
      `${BASE_URL}/auth/register`,
      testUser
    );
    // Test email login
    try {
      const emailLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: testUser.email,
        password: testUser.password,
      });
      } catch (error) {
      }

    // Test username login
    try {
      const usernameLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: testUser.username,
        password: testUser.password,
      });
      } catch (error) {
      }

    // Test 4: Verify JWT token functionality
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: testUser.username,
      password: testUser.password,
    });

    const token = loginResponse.data.token;
    if (!token) {
      return;
    }

    // Test token validation
    try {
      const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      } catch (error) {
      }

    // Test 5: Verify security headers and error messages
    // Test generic error messages (security through obscurity)
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: "nonexistent@example.com",
        password: "wrongpassword",
      });
      } catch (error) {
      if (error.response?.status === 401) {
        const errorMessage = error.response.data.message;
        if (errorMessage === "Invalid email or password") {
          "
          );
        } else {
          }
      }
    }

    // Test 6: Verify rate limiting
    const rapidRequests = [];
    for (let i = 0; i < 15; i++) {
      rapidRequests.push(
        axios
          .post(`${BASE_URL}/auth/login`, {
            emailOrUsername: "rate_test@example.com",
            password: "password123",
          })
          .catch((error) => error)
      );
    }

    const results = await Promise.all(rapidRequests);
    const rateLimited = results.filter(
      (r) => r.response?.status === 429
    ).length;
    const authErrors = results.filter((r) => r.response?.status === 401).length;

    if (rateLimited > 0) {
      } else {
      }

    } catch (error) {
    console.error(
      "❌ Final security check failed:",
      error.response?.data || error.message
    );
  }
}

// Run the final security check
testFinalSecurityCheck();
